# Proposal: workflow-reform

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

**Level**: critical
**Auto-assessed**: critical (core-path: renames two lifecycle commands, adds a sub-agent role, and changes the fix-loopback and archive contract — a regression bricks the user's daily workflow; Standard triple review + mandatory human archive approval is retained and an explicit regression audit is added to the review gate)

## Intent

The current blueprint workflow has grown accretive: the review step splits fixing into `--fix` mode flags on plan/apply/review, the archive step delegates to `bp finalize` with no pre-archive spec reconciliation, the propose/roadmap steps embed a "relentless" interview that over-asks during routine planning, plan-step design items lack explicit acceptance criteria, and step prompts carry accumulated boilerplate. The workflow no longer reads as one coherent, minimal contract.

This change is a single workflow reform that re-grounds the lifecycle: rename `review` to `check` (the gate that verifies a change) while keeping the review artifact file name; introduce a `bp-fixer` sub-agent that repairs proposal/design/implementation from the reviewer's report and then triggers a **full** re-review (not a fix-mode diff check); rename `finalize` to `finish` and add an orchestrated archive-check step that reconciles delta specs against what was actually implemented before finishing; make propose grill first (aligned to the grilling method) then write a detailed proposal; require each design item to carry explicit requirements, constraints, and acceptance criteria; make roadmap planning a lightweight grilling that defers requirement detail to per-change propose steps; and simplify every step prompt so each instruction says one thing, plainly.

Why now: the reform is specified by the user (FIX.md at the repo root) and landed as the next direction after the v2 architecture refactoring milestone. Doing it as a single change keeps the lifecycle contract consistent across all rename/content/simplification touchpoints at once, avoiding a half-renamed intermediate state.

## Scope

### In Scope

- Rename the `review` workflow step to `check` (command `bp check`, registry key `check`, template `check.ts`, platform step files, `continue` routing, context/state specs), keeping the review artifact file named `review.md`.
- Add a `bp-fixer` sub-agent (no `bp fix` command) dispatched by the check step to repair proposal/design/implementation from the reviewer report, followed by a full re-review by the reviewer (remove the review `--fix` "only re-check fixes" mode).
- Rename `bp finalize` to `bp finish` and add an orchestrated pre-archive "archive check" step that scans the change's proposal/design/implementation and adjusts delta specs (ADD/MODIFY) to match reality before finishing.
- Propose step: grill the user first (aligned to the grilling skill method) then write the detailed proposal from the grilling output.
- Plan step: every design item (DS-N) carries explicit Requirements, Constraints, and Acceptance Criteria fields.
- Roadmap step: lightweight grilling to determine project direction and agree milestones/phases; requirement detail deferred to each change's propose step.
- Simplify every workflow template and agent prompt: one sentence per point, no boilerplate, no repetition.
- Update the stale `bp/specs/archive/spec.md` (still names `blueprint archive <path>`).

### Out of Scope

- Changing the artifact file name `review.md` (kept — decision: step name changes, artifact name does not).
- Adding a `bp fix` CLI command (decision: fix is a sub-agent only).
- Reordering or removing lifecycle steps beyond the review→check rename and fix-loopback relocation.
- Changing the planner's impact-analysis or the executor's TDD protocol semantics (content simplified, protocol unchanged).
- Telemetry / spec-confidence / scheduling work from roadmap M2/M3.
- Introducing a new archive sub-agent (decision: archive check is an orchestrated step, not a sub-agent).

## Research Landscape

> This change was informed by investigation of:
> - FIX.md (repo root): the user's own reform specification — 7 items covering prompt simplification, propose grilling, plan DS-N acceptance fields, check-step fix loopback via a bp-fixer sub-agent, archive finish + pre-archive check, and roadmap lightweight grilling.
> - mattpocock grilling skill (installed plugin): the interview method propose/roadmap should align to — one question at a time, recommended answer provided, resolve every decision-tree branch before proceeding.
> - Current codebase map: `WORKFLOW_REGISTRY` (11 keys incl. review), `src/commands/bp-review.ts`/`bp-finalize.ts`, `src/templates/workflows/{review,archive,propose,roadmap,plan}.ts`, `src/templates/agents/index.ts` (AGENT_PROMPTS), 6 platform generator `STEP_DEFS`/`STEPS` arrays, and specs `context`/`state`/`templates`/`archive`/`plan-review`.

## Approach

Apply the reform as one coordinated change over the lifecycle surface: (1) structural rename review→check and finalize→finish across registry, commands, templates, platform step definitions, generated files, `continue` routing, schema, and specs; (2) introduce the `fixer` agent role in `AGENT_PROMPTS` and every platform agents generator plus OMP `detectAgentType`, and rewire the review loop so the check step dispatches `bp-fixer` then re-runs a full review; (3) add the archive-check orchestration step to the archive template and route it before `bp finish`; (4) upgrade propose/plan/roadmap step content (grilling-first propose, DS-N requirements/constraints/acceptance, lightweight roadmap grilling); (5) simplify all step and agent prompts last, so simplification runs once over the final structure. Snapshot regeneration, `continue`/schema/context/state spec updates, and `bp/specs/archive/spec.md` repair ride along. Implementation is a Standard-wave execution with TDD for behavior tasks; the review gate includes an explicit regression audit given the critical level.

## Deliverables

### PR-1: Rename review step to check (artifact stays review.md)

- **Domain**: specs/templates/spec.md, specs/context/spec.md, specs/state/spec.md
- **Behavior**: The system SHALL expose the change-verification lifecycle step as `bp check <name>` (command, template body, registry key `check`, platform step files, `continue` routing, schema action, context/state step name) while the review artifact file remains named `review.md` (all existing references to the artifact are unchanged).

**Rationale**:
The step's purpose is verifying a change; "check" reads as a gate, not a process. The rename is structural (command/surface) not artifact: the user decided the artifact file stays `review.md` to bound the blast radius. Every reference to the step name (registry key, generated command/skill files, `continue` routing, schema action step, context/state specs) must be updated together so the lifecycle stays internally consistent.

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| src/templates/workflows/registry.ts | `WORKFLOW_REGISTRY` keys `init, roadmap, propose, plan, apply, review, archive, continue, ff, loop, refactor` | rename key `review`→`check`, keep `review.md` artifact |
| src/core/continue.ts:265-344 | fix-routing branches call `getWorkflowInstructions('review'|'plan'|'apply'|'archive')` | route must use `check` |
| 6× src/integrations/{omp,claude-code,opencode,agent,codex}/* STEPS/STEP_DEFS | each platform enumerates step names for generated files | update step arrays + snapshots |
| bp/specs/context/spec.md, state/spec.md | name `review` as a change step / transition | update step name |
| src/templates/workflows/review.ts | `WORKFLOW_REGISTRY.review` body + `bp-review.ts:66` prints it | rename module + command registration |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| Keep `review` step name, only add `check` alias | leaves two names for one step; user asked for the rename |
| Rename artifact to `check.md` too | user decided artifact stays `review.md` to bound blast radius |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Missed reference (docs, snapshots, continue) leaves half-renamed state | med | grep every `review` step-name reference; regenerate all platform snapshots; full suite must pass |
| `bp continue` routes to wrong step after rename | med | update `continue.ts` fix-routing + schema action; integration test for continue chain |

- **Verify**: `bp check <name>` prints the check-step instructions; generated `.claude/commands/bp-check.md` (and per-platform equivalents) exist and `bp-review.md` no longer does; `bp continue` reports `check` as the next step; `npm test` green with regenerated snapshots.
- **Files**: src/templates/workflows/{review.ts→check.ts,registry.ts}, src/commands/{bp-review.ts→bp-check.ts}, src/core/{continue.ts,schema.ts}, src/integrations/{omp,claude-code,opencode,agent,codex}/*, generated .claude/commands/bp-check.md, bp/specs/{context,state,templates}/spec.md, snapshots

### PR-2: bp-fixer sub-agent + full re-review in the check step

- **Domain**: specs/templates/spec.md, specs/context/spec.md, specs/platform-gen/spec.md
- **Behavior**: The system SHALL provide a `bp-fixer` sub-agent (role `fixer` in `AGENT_PROMPTS`, every platform agents generator, and OMP `detectAgentType`) that the check step dispatches to repair a change's proposal, design, and implementation from the reviewer report; after the fixer completes, the check step SHALL dispatch the reviewer for a full re-review of the entire change (all three gates), not a fix-mode diff-only check.

**Rationale**:
The current fix loop lives as `--fix` modes on plan/apply/review, so a reviewer re-run in `--fix` mode only re-checks the fixed issues — latent regressions elsewhere in the change go unverified. FIX.md replaces this with a dedicated `bp-fixer` sub-agent that repairs all three artifacts (proposal/design/implementation), then a full re-review. The user decided there is NO `bp fix` CLI command — the fixer is a sub-agent role dispatched from the check step, mirroring how the refactorer is dispatched. The reviewer's `--fix` mode is removed; every reviewer run is a full triple review.

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| .claude/agents/bp-refactorer.md | precedent: sub-agent role without a lifecycle command, dispatched via `bp dispatch` | model `fixer` role + `bp dispatch fixer` |
| src/templates/agents/index.ts:990-996 | `AGENT_PROMPTS` roles planner/executor/reviewer/codebase-scanner/refactorer | add `fixer` |
| src/integrations/*/agents.ts | per-platform agent file generators | emit bp-fixer on all agent platforms |
| src/integrations/omp/extension-runtime.ts | `detectAgentType` discriminates sub-agents | add `fixer` branch |
| .claude/agents/bp-reviewer.md Fix Mode | three-state `[ ]→[~]→[x]` + fix-mode section | remove fix mode; reviewer always full review |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| `bp fix <name>` CLI command | user decided fixer is a sub-agent only, no command |
| Keep review `--fix` mode | FIX.md removes it — a full re-review is more correct than a fix-only diff check |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Full re-review after every fix round is slower | med | keep the diminishing-returns fuse / round cap; full review only on each check invocation |
| fixer over-edits beyond reviewer findings | med | fixer prompt bounds scope to reviewer issues + spec sync; fixer commits atomically and keeps tests green |

- **Verify**: `bp dispatch fixer` emits a dispatch block; `AGENT_PROMPTS['fixer']` is non-empty and a platform agent file `bp-fixer.md` is generated on each agent platform; reviewer prompt has no fix-mode section; an integration test runs check→fixer→full re-review on a fixture.
- **Files**: src/templates/agents/index.ts, .claude/agents/bp-fixer.md, src/integrations/{omp,claude-code,agent,opencode}/*agents.ts, src/integrations/omp/extension-runtime.ts, src/templates/workflows/check.ts, src/commands/bp-dispatch.ts, tests, snapshots

### PR-3: Archive reform — finalize→finish + orchestrated archive check

- **Domain**: specs/archive/spec.md, specs/templates/spec.md
- **Behavior**: The system SHALL expose the archive executor as `bp finish <name>` (renamed from `bp finalize`), and the archive step SHALL include an orchestrated archive-check step that scans the change's proposal, design, and implementation, adjusts the change's delta specs (ADD/MODIFY requirements) to match what was actually implemented, and only then runs `bp finish` to merge and move the change.

**Rationale**:
`bp finalize` today merges whatever delta specs the planner wrote and never reconciles them against what was actually implemented — a change can archive specs that drift from the code. FIX.md renames the executor to `bp finish` and inserts a pre-archive check: scan proposal/design/implementation, add or modify delta-spec requirements so the archived specs match reality, then finish. The user chose the orchestrated-step form (not a new sub-agent): the archive template gains a Step (archive check) the orchestrator executes before invoking `bp finish`. The stale `bp/specs/archive/spec.md` (still names `blueprint archive <path>`) is repaired in the same change.

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| src/commands/bp-finalize.ts:167-209 | merges delta specs with no pre-merge reality scan | add archive-check step before merge |
| src/templates/workflows/archive.ts:38-43 | template Step 3 runs `bp finalize $1` | rename to `bp finish` + insert archive-check step |
| bp/specs/archive/spec.md | stale command names `blueprint archive <path>` | rewrite to current command surface |
| bp/specs/templates/spec.md:564 | names lifecycle commands incl. `bp archive` | add `bp finish` naming as appropriate |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| New archive sub-agent does the check | user chose orchestrated step (keeps archive read-only on code; no new agent) |
| Keep `bp finalize` name | user/FIX.md renames to `bp finish` |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Archive check edits specs then finish conflicts | med | archive-check writes only to `specs/<domain>/spec.md` delta files; finish re-verifies merge; conflict → resolve in delta spec and re-run |
| rename breaks existing scripts/docs | med | grep all `finalize` references (command, templates, comments, snapshots); keep `finish` as the only name |

- **Verify**: `bp finish <name>` archives a change end-to-end; `bp finalize` no longer registered; archive template contains the archive-check step before `bp finish`; an integration test runs archive-check (spec ADD/MODIFY) then finish and asserts merged specs reflect the adjusted requirements; `bp/specs/archive/spec.md` names the current commands.
- **Files**: src/commands/bp-finalize.ts→bp-finish.ts, src/cli.ts, src/templates/workflows/archive.ts, bp/specs/archive/spec.md, tests, snapshots

### PR-4: Planning quality — grilling-first propose + DS-N requirements/constraints/acceptance

- **Domain**: specs/plan-review/spec.md, specs/templates/spec.md
- **Behavior**: The propose step SHALL grill the user first (one question at a time, recommended answer provided, aligned to the grilling method) and write the detailed proposal from the grilling output; the plan step SHALL require every design item (DS-N) to carry explicit Requirements, Constraints, and Acceptance Criteria fields (in the design template and the planner prompt, verified by the plan step's quality review).

**Rationale**:
Propose already embeds a "relentless" grill but the step text is long and the proposal template is fetched after grilling — FIX.md wants grilling aligned to the grilling skill and the proposal to carry every grilling detail (extending the template if needed). Plan-step design items today have Key Interfaces + Detailed Design but no explicit acceptance criteria, so an executor can build to a design that was never given a pass/fail bar. Adding Requirements/Constraints/Acceptance Criteria per DS-N makes every design item verifiable before implementation, and the plan step's quality gate checks those fields.

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| src/templates/workflows/propose.ts:32-63 | embedded RELENTLESS grill before writing proposal | align to grilling method, ensure template fetched after grilling and carries all details |
| src/templates/artifacts/index.ts DESIGN_TEMPLATE DS-N | fields: Key Interfaces + Detailed Design only | add Requirements / Constraints / Acceptance Criteria |
| .claude/agents/bp-planner.md | planner fills DESIGN_TEMPLATE | prompt DS-N to fill the three new fields |
| src/templates/workflows/plan.ts Step 4 | five design-quality dimensions | add a dimension (or extend) checking the new fields |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| Keep propose grill as-is (already exists) | user wants it aligned to grilling skill and proposal to carry all details |
| Add acceptance criteria only as free text in Detailed Design | needs a first-class field so the plan quality gate can check it |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Extra DS-N fields bloat designs | low | fields are short bullets; template guides concise phrasing |
| Grilling-first propose slows trivial changes | med | keep trivial/light skip path (propose.ts already skips grill for trivial/light) |

- **Verify**: propose template Step 1 (grill) is present and Step 3 says fetch template after grilling and fill from grilling details; DESIGN_TEMPLATE DS-N includes Requirements/Constraints/Acceptance-Criteria; planner prompt instructs filling them; plan Step 4 dimension checks their presence; a fixture proposal reflects grilling output.
- **Files**: src/templates/workflows/propose.ts, src/templates/artifacts/index.ts, src/templates/agents/index.ts (PLANNER_PROMPT), src/templates/workflows/plan.ts, bp/specs/plan-review/spec.md, tests, snapshots

### PR-5: Roadmap lightweight grilling

- **Domain**: specs/templates/spec.md, specs/context/spec.md
- **Behavior**: The roadmap step SHALL first conduct a lightweight grilling to determine what the project should do and agree milestones/phases with the user, and SHALL defer detailed requirement capture to each change's propose step.

**Rationale**:
The roadmap template currently embeds a full "relentless" interview (roadmap.ts:9) that asks for key features, edge cases, failure modes, etc. at the milestone level — detail that belongs in per-change propose steps. FIX.md wants a lightweight grilling: establish project direction, agree the milestone/phase skeleton, then let each change's propose step (PR-4) capture the requirements. This keeps the roadmap a direction document, not a requirements spec.

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| src/templates/workflows/roadmap.ts:9-39 | Step 1 is a full RELENTLESS grill (features/edge cases/failure modes) | replace with lightweight grilling: direction + milestone/phase agreement |
| bp/specs/context/spec.md | `grill` is a project step | keep grill classification; roadmap grilling is the lightweight variant |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| Keep full relentless grill at roadmap level | over-asks; requirement detail belongs in propose (FIX.md item 7) |
| Remove grilling from roadmap entirely | FIX.md keeps a lightweight grilling to set direction |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Milestones underspecified without full grill | low | lightweight grill still resolves direction + dependencies; propose captures detail |

- **Verify**: roadmap template Step 1 is the lightweight grilling (direction + milestones/phases, deferring requirement detail); an integration/snapshot test reflects the new body; `bp roadmap` still produces a valid roadmap.md.
- **Files**: src/templates/workflows/roadmap.ts, bp/specs/{templates,context}/spec.md, snapshots

### PR-6: Prompt simplification across all templates and agents

- **Domain**: specs/templates/spec.md
- **Behavior**: Every workflow template body and every agent prompt SHALL be simplified so each instruction states one thing plainly, without boilerplate, repetition, or redundant hedging — while preserving the exact behavioral contract (the Input/Steps/Output/Guardrails structure and all required guardrails).

**Rationale**:
FIX.md item 1: "对每个步骤的提示词进行精简，做到一句话说清楚的事情直接说明白，不说废话." The workflow has accreted long repeated blocks (context reminders, level tables, guardrail lists appear in several templates). Simplification runs last so it applies once over the renamed/reformed structure and each step's contract stays intact. This is the riskiest PR for drift: every template and agent body changes textually, so the review gate includes a contract-preservation check (behavioral requirements still present).

**Research**:
| Source | Finding | Impact |
|--------|---------|--------|
| src/templates/workflows/*.ts (12 bodies) | long templates with repeated context/level/guardrail blocks | dedupe into shared.ts constants where shared; trim prose to one sentence per point |
| src/templates/agents/index.ts + .claude/agents/*.md | agent prompts with repeated constraints | simplify while preserving required keywords the tests assert |
| tests + snapshots | assert template/agent content keywords | simplification must keep asserted keywords (e.g. `## Steps`, `## Guardrails`) or tests update deliberately |

**Alternatives Considered**:
| Alternative | Reason Rejected |
|-------------|----------------|
| Simplify only new/changed templates | FIX.md wants every step prompt simplified |
| Defer simplification to a later change | user chose to include it in this single change |

**Risks & Mitigations**:
| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Simplification drops a required guardrail/behavior | med | contract-preservation pass in review; tests assert required keywords; full suite must pass |
| Snapshot churn across 5 platforms | high | regenerate snapshots deliberately; verify diff only trims prose, no behavior change |

- **Verify**: every workflow template and agent prompt has been trimmed (diff review); asserted keywords still present (tests pass); full suite green; a reviewer contract-preservation check confirms no guardrail removed.
- **Files**: src/templates/workflows/*.ts, src/templates/agents/index.ts, .claude/agents/*.md, src/templates/workflows/shared.ts, snapshots

## Dependencies

- none

