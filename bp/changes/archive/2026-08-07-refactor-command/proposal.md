# Proposal: refactor-command

<!--
  This is the human-AI agreement document. It captures WHY and WHAT, not HOW.
  The planner agent reads this to produce design.md, tasks.md, and delta specs.

  Quality bar:
  - Intent explains the problem with full context, not just the solution
  - Scope boundaries are explicit and justified
  - Each PR-N has Rationale documenting WHY decisions were made
  - Each PR-N documents Research, Alternatives, and Risks where applicable
  - Deliverables are observable (you can verify each one)
  - Each deliverable traces to a spec domain
-->


## Level

<!--
   risk-based level. Auto-assessed by propose, overridable by --level.
  trivial:  single file, docs/config/scaffolding, no behavior change
  light:    2-5 files, low-risk behavior change, good test coverage
  standard: cross-module, new behavior, medium risk (default)
  critical: auth/payment/data-consistency/core-path
-->

**Level**: standard
**Auto-assessed**: standard (cross-module, new behavior, medium risk — new workflow step, new analyzer engine, new sub-agent)

## Intent

AI agents (including bp's own executor, planner, and reviewers) produce code that drifts structurally over time: many small fragmented files, near-duplicate helper blocks copy-pasted across modules, flat single-layer directories with no internal hierarchy, and exported utilities with fan-in of one that no one reuses. The result is a wide, shallow codebase with high maintenance cost — the opposite of the deep-module shape that keeps complexity hidden behind small interfaces (Ousterhout, *A Philosophy of Software Design*).

Today bp has no way to systematically counteract this drift. `bp map` can *describe* module structure (files, exports, imports, dependencies) but offers no judgment about structural health, and nothing rewrites the code or keeps `bp/specs/` behavioral contracts in sync after a structural consolidation. The user asked for a dedicated refactor capability: a command that (1) detects the fragmentation/duplication/flatness/low-reuse anti-patterns with concrete evidence, (2) drives a refactorer agent to consolidate the code toward deep modules with high reuse, and (3) updates the related specs so the recorded behavioral contracts stay truthful.

Key design constraints established in discussion:

- The CLI command does NOT do the work itself. Like every `bp-*` step, `bp refactor` is a workflow step: the CLI outputs the step content (analysis → human confirmation → dispatch → spec sync), and the real deliverable is the generated slash command + skill (`bp-refactor`) identical in kind to the existing `bp-propose`/`bp-plan`/… commands and skills across all platforms.
- Static analysis is deterministic and quantified (four anti-pattern metrics + a deep-module depth ratio), not left to LLM judgment; thresholds are configurable in `config.yaml`.
- Refactor is a standalone auxiliary step (like `ff`/`loop`), not a `bp/changes/` lifecycle change — no proposal/plan/review ceremony per refactor run.
- The refactorer sub-agent updates affected global specs directly (same mechanism `bp spec refresh --apply` uses via the codebase-scanner), and output includes a diff summary.

## Scope

### In Scope

- New workflow step `refactor` registered in `WORKFLOW_REGISTRY` and `STEP_DEFS`, generating `bp-refactor` slash command files for omp / claude-code / opencode and `bp-refactor` skill for agent / codex (`.agent/skills/bp-refactor/`, `.agents/skills/bp-refactor/`).
- New CLI command `bp refactor <target>` that outputs the refactor workflow steps (analysis → human confirmation gate → per-module dispatch → spec sync → diff summary); `bp refactor` does not analyze or rewrite itself.
- New deterministic analysis engine `src/core/refactor-analyzer.ts` with an `analyze` subcommand (`bp refactor analyze <target>`): per-module evidence for fragmentation (≤2 exports + small file), duplication (cross-file n-gram similarity ≥ 0.8 blocks), flatness (directory depth ≤ 1 / no sub-structure), low reuse (fan-in ≤ 1 with ≥ 3 exports), and a deep-module depth ratio (implementation lines ÷ interface exports, plus fan-in) as the refactor direction.
- Analysis report written to `bp/.refactor-report.md` (structured, per-module, consumed by the refactorer sub-agent) with a summary on stdout; thresholds configurable under a `refactor:` section in `bp/config.yaml` with documented defaults.
- New `refactorer` sub-agent (system prompt in `src/templates/agents/` + generated platform agent files): reads the report, performs behavior-preserving per-module consolidation toward deep modules, keeps the test suite green, and updates the affected `bp/specs/<domain>/spec.md` contracts.
- Global spec updates documenting the refactor workflow (platform-gen + templates domains) — the "update related specs" of this change itself.

### Out of Scope

- No `bp/changes/` lifecycle integration: refactor does not create proposals, delta specs, or archive entries; spec changes are direct global-spec edits reviewed via git diff.
- No automatic whole-repo rewrites without human confirmation: the analysis report is always shown and approved before any dispatch.
- No cross-module architectural re-layering decisions (e.g. splitting a module into layers) made by the analyzer — the analyzer reports evidence; the refactorer proposes structure; final structure is human-confirmed via the report.
- No dependency upgrades, no dead-code removal beyond what consolidation requires, no formatting/lint changes.
- No changes to the existing `bp map` / `bp spec refresh` commands beyond reusing their data.
- No new thresholds for languages outside the existing codebase-map parser coverage (TS/JS via Babel, regex fallback for the listed languages).

## Research Landscape

> This change was informed by investigation of:
> - `src/commands/bp-propose.ts`: CLI workflow commands output instructions via `getWorkflowInstructions(step)` and do not write files. `bp refactor` follows the same pattern.
> - `src/templates/workflows/registry.ts` + `src/integrations/omp/commands.ts`: `WORKFLOW_REGISTRY` maps step → skill/command template getters; `STEP_DEFS` drives `.omp/commands/bp-<step>.md` generation; claude-code / opencode / agent / codex generators consume the same registry. Adding a step touches registry + templates + STEP_DEFS + platform generators.
> - `src/core/codebase-map.ts`: per-module `files`/`exports`/`imports`/`responsibility` and per-file exports/imports are already computed; fan-in and flatness are derivable from existing data; duplication is NOT in the map and requires a new n-gram scan.
> - `src/commands/bp-dispatch.ts`: executor isolation per platform (omp `isolated: true`, claude-code worktree, agent/codex `git worktree add`) — refactorer dispatch reuses this machinery.
> - `src/integrations/omp/extension-runtime.ts` (per AGENTS.md contract): sub-agent discrimination via `detectAgentType` recognizes planner/executor/reviewer — a new `refactorer` agent type must be added there and in platform agent generators.
> - Ousterhout, *A Philosophy of Software Design* (deep module definition: small interface, large implementation, widely reused) — the source for the depth-ratio metric and the refactor direction.

## Approach

Add `refactor` as a first-class workflow step alongside the existing steps. The step content (generated as `bp-refactor` slash command/skill on every platform) instructs the orchestrator to: (1) run the deterministic analyzer (`bp refactor analyze <target>`, new TS engine reusing codebase-map data plus a duplication scan) which writes `bp/.refactor-report.md`; (2) show the report and obtain explicit human confirmation of scope; (3) dispatch the new `refactorer` sub-agent once per affected module (isolated, executor-style) to consolidate toward deep modules while preserving behavior and keeping tests green; (4) have the refactorer update only the affected `bp/specs/<domain>/spec.md` contracts; (5) summarize the diff for human review. The CLI command `bp refactor <target>` only prints these steps — it never analyzes or rewrites. The analyzer's four metrics + depth ratio are deterministic, evidence-based, and threshold-configurable; the refactorer is bounded by behavior-preservation constraints and per-module isolation to keep blast radius small.

## Deliverables

### PR-1: Refactor workflow step (slash command + skill on all platforms)

- **Domain**: specs/platform-gen/spec.md, specs/templates/spec.md
- **Behavior**: The system SHALL register a `refactor` workflow step in `WORKFLOW_REGISTRY` and `STEP_DEFS` and SHALL generate a `bp-refactor` slash command for omp / claude-code / opencode and a `bp-refactor` skill for agent / codex, and SHALL provide a `bp refactor <target>` CLI command that outputs the refactor step instructions without analyzing or rewriting.

**Rationale**:
The user's core constraint is that the CLI never does the work itself — like every `bp-*` step, the command returns step content and the executable artifact is the platform-generated slash command/skill. Making `refactor` a registered workflow step means it automatically ships to all platforms through the existing generators (commands for omp/claude-code/opencode, skills for agent/codex), stays consistent with `bp continue`'s step registry, and keeps the user experience identical to the other steps. The step content encodes the agreed flow: analyze → human confirmation → dispatch refactorer → spec sync → diff summary.

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| `src/commands/bp-propose.ts` | CLI step commands call `getWorkflowInstructions(step)` and print; no file writes | `bp refactor` mirrors this; instructions live in workflow templates |
| `src/templates/workflows/registry.ts` | Registry maps step → `{skill, command}` template getters | New `refactor.ts` template + registry entry |
| `src/integrations/omp/commands.ts` `STEP_DEFS` | Drives `.omp/commands/bp-<step>.md`; all platforms consume it | Add refactor entry; platform generators + snapshots update |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| CLI performs analysis/rewrite directly | User explicitly rejected: CLI returns step content only |
| Standalone script not integrated with workflow registry | Would not ship as `bp-*` slash command/skill on all platforms |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Snapshot churn across all platform generators | med | Generator tests updated deliberately; new snapshots reviewed for exactly the `bp-refactor` files |
| `bp continue` step registry drift | low | Registry is the single source; continue engine derives from it |

- **Verify**: `npm test` — generator snapshot tests include `bp-refactor` files for all platforms; `bp refactor some-target` prints the step instructions; `WORKFLOW_REGISTRY.refactor` and `STEP_DEFS` entries present.
- **Files**: `src/templates/workflows/refactor.ts` (new), `src/templates/workflows/registry.ts`, `src/integrations/omp/commands.ts`, `src/integrations/opencode/commands.ts`, `src/integrations/agent/skills.ts` / `agents.ts`, `src/integrations/codex/skills.ts`, `src/integrations/claude-code/commands.ts`, `src/commands/bp-refactor.ts` (new), `src/cli.ts`, generator snapshots.

### PR-2: Deterministic refactor analyzer (`bp refactor analyze <target>`)

- **Domain**: specs/platform-gen/spec.md
- **Behavior**: The system SHALL provide `bp refactor analyze <target>` that computes per-module evidence for fragmentation (≤2 exports and file below size threshold), duplication (cross-file blocks with n-gram similarity ≥ 0.8), flatness (module directory depth ≤ 1 or no sub-structure), and low reuse (fan-in ≤ 1 with ≥ 3 exports), plus a deep-module depth ratio (implementation lines ÷ interface exports, with fan-in) per module, and SHALL write the structured report to `bp/.refactor-report.md` while printing a summary to stdout, with all thresholds configurable in `bp/config.yaml` and applied from documented defaults.

**Rationale**:
The four anti-patterns are the measurable face of the user's problem ("碎片、重复、复用率低、层次扁平"), and the depth ratio gives the refactorer a concrete direction (deep module: small interface, large implementation, high fan-in). The user chose a deterministic TS engine over LLM judgment because n-gram duplication detection and fan-in counts need exact, reproducible evidence — a report the human can audit before approving any rewrite. Reusing codebase-map data keeps the analyzer cheap (fan-in, flatness, exports, file sizes are already computed); only duplication requires a new scan. Configurable thresholds (user accepted) keep the engine usable across codebases without code changes.

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| `src/core/codebase-map.ts` | Per-module files/exports/imports and per-file exports/imports exist; fan-in and depth derivable; no duplication data | Analyzer reuses map JSON (via `loadMap`) + adds n-gram similarity scan |
| `src/core/codebase-map.ts` `computeFingerprint` | Fingerprint detects staleness | `analyze` reuses map freshness check (or refreshes like `bp map refresh`) |
| Ousterhout, *A Philosophy of Software Design* | Deep module = small interface, large implementation, wide reuse | Depth ratio = impl lines ÷ interface exports; fan-in as reuse signal |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| Metrics encoded in refactorer prompt, LLM judges | Duplication/`fan-in` need exact counts; LLM n-gram judgment unreliable and non-reproducible |
| Reuse `bp map` queries only, no new scan | No duplication signal exists in the map; duplication is the user's #2 complaint |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| n-gram similarity false positives (boilerplate, imports) | med | Configurable threshold (default 0.8); report lists evidence blocks; human gate before dispatch |
| Large-repo scan cost | med | Per-module granularity + target filter; reuse existing map instead of re-parsing |

- **Verify**: unit tests on a fixture tree with known duplication/flatness/low-reuse (deterministic findings); `bp refactor analyze <fixture>` produces `bp/.refactor-report.md` with expected per-module evidence; a `config.yaml` `refactor.thresholds` override changes the findings; stdout summary printed.
- **Files**: `src/core/refactor-analyzer.ts` (new), `src/core/codebase-map.ts` (map export of internals if needed), `src/commands/bp-refactor.ts` (analyze subcommand), `src/core/config.ts` (refactor threshold schema), `tests/core/refactor-analyzer.test.ts` (new), `bp/specs/platform-gen/spec.md`.

### PR-3: Refactorer sub-agent (behavior-preserving consolidation + spec sync)

- **Domain**: specs/templates/spec.md, specs/general/spec.md
- **Behavior**: The system SHALL provide a `refactorer` sub-agent (system prompt in `src/templates/agents/` and generated agent files on each platform) that consumes `bp/.refactor-report.md`, consolidates each assigned module toward deep modules while preserving observable behavior, keeps the test suite green, and SHALL update only the affected `bp/specs/<domain>/spec.md` behavioral contracts to match the consolidated structure.

**Rationale**:
The actual rewriting is agent work, matching the repo's sub-agent architecture (planner/executor/reviewer). The user's flow requires human confirmation before dispatch, so the refactorer is bounded: behavior-preserving only (structure consolidation, no semantic changes), per-module isolation (executor-style) to keep blast radius small, and it must keep tests green — the same discipline the executor follows. Spec sync is part of the same dispatch (like `bp spec refresh --apply`'s codebase-scanner) so contracts stay truthful after consolidation; the "update related specs" requirement is satisfied at runtime, not as a manual follow-up. A new agent type requires the OMP extension's `detectAgentType` discrimination to recognize `refactorer`.

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| `src/templates/agents/index.ts` | 3 agent prompts (planner/executor/reviewer) with shared `AGENT_CONSTRAINTS`/`READONLY_CONSTRAINTS` | Refactorer prompt reuses shared constraints; new export |
| `src/commands/bp-dispatch.ts` | Per-platform executor isolation (omp param, claude-code worktree, agent/codex git worktree) | Refactorer dispatch reuses isolation machinery |
| `src/integrations/omp/extension-runtime.ts` + AGENTS.md contract | `detectAgentType` discriminates planner/executor/reviewer at session_start | Add `refactorer` branch; extension tests update |
| `bp spec refresh` / codebase-scanner | Direct global-spec update mechanism with `--apply` | Refactorer updates affected domains directly (standalone step choice) |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| Full change lifecycle (proposal/plan/review/archive + delta specs) | User chose standalone step: refactor cadence should be lightweight; ceremony reserved for feature changes |
| Half-lifecycle (proposal-lite + delta spec + finalize) | More machinery than needed; direct global-spec edits + git diff review chosen instead |
| Spec sync as separate later step | Contracts would be stale between refactor and sync; same-dispatch sync chosen |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Behavior change during consolidation (semantics altered) | med | Behavior-preservation constraints in prompt; tests must stay green; per-module isolation; diff summary for human review |
| Spec edits too broad (rewrites unrelated contracts) | med | Prompt limits spec updates to affected domains; diff visible in git for review |
| OMP extension discrimination misses new agent type | med | `detectAgentType` branch + extension tests updated in same change |

- **Verify**: prompt template unit test (exported, deterministic, no placeholders); integration test: dispatch `refactorer` on a fixture module → consolidated structure, tests green, affected spec updated, unrelated spec untouched.
- **Files**: `src/templates/agents/index.ts` (refactorer prompt), `src/integrations/omp/agents.ts` + claude-code/agent/opencode agent generators, `src/integrations/omp/extension-runtime.ts` (detectAgentType), agent generator snapshots, `tests/integration/` (new refactor flow test).

### PR-4: Global spec documentation of the refactor workflow

- **Domain**: specs/platform-gen/spec.md, specs/templates/spec.md
- **Behavior**: The system SHALL document the refactor step in the global specs: a requirement covering the generated `bp-refactor` command/skill on all platforms, the analyzer contract (four metrics + depth ratio + configurable thresholds + `bp/.refactor-report.md`), and the refactorer contract (behavior-preserving consolidation, per-module isolation, affected-domain spec sync, human confirmation gate).

**Rationale**:
The change's own "update related specs" requirement must be satisfied for the workflow machinery itself: the platform-gen spec records what generators must emit, the templates spec records the workflow registry and agent-prompt contracts. These are the specs the refactor step and analyzer implement against, and they make the new step visible to `bp spec refresh` drift checks.

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| `bp/specs/platform-gen/spec.md` | Existing requirements for step generation, cleanup, codex/claude hooks, OMP extension | New requirements added in same domains |
| `bp/specs/templates/spec.md` | Workflow registry / template source-of-truth requirements | Refactor templates + refactorer prompt requirements added |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| Docs-only update, no spec requirements | Specs are the source of truth for behavior in this repo; drift checks would flag undocumented behavior |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Spec/implementation drift after merge | low | Spec written alongside implementation; `bp spec refresh --check` validates |

- **Verify**: `bp/specs/platform-gen/spec.md` and `bp/specs/templates/spec.md` contain the new requirements with scenarios; artifact validator passes on spec files.
- **Files**: `bp/specs/platform-gen/spec.md`, `bp/specs/templates/spec.md`, `docs/platform-integration.md` (refactor section).


## Dependencies

- none

## Roadmap Reference

- **Milestone**: M1: v2 Architecture Refactoring
- **Phase**: P1.1: Core Engine
