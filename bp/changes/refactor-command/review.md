# Review: refactor-command

<!--
  Triple review result. Produced by the reviewer agent.
  This is the gate between apply and archive.

  Three dimensions:
  1. Spec Review (Spec Gate): delta spec requirements vs implementation
  2. Quality Review (Quality Gate): code bugs, security, conventions
  3. Goal Review (Goal Gate): proposal deliverables vs implementation

  Issue prefixes:
  - R-N: Spec non-compliance -> reapply (bp apply --fix)
  - Q-N: Quality issue -> reapply (bp apply --fix)
  - G-N: Goal not achieved -> reapply (bp apply --fix)
  - D-N: Design/architecture flaw -> replan (bp plan --fix)

  Verdict rules:
  - Zero issues -> PASS
  - Any D issue -> FAIL
  - Any BLOCKER severity -> FAIL
  - Only R/Q/G (no D, no BLOCKER) -> NEEDS_REVISION
-->


## Level Assessment

- **Proposal Level**: standard
- **Reviewer Assessment**: same
- **Escalation**: none (cross-module new behavior with dedicated tests; no auth/payment/data-consistency/core-path surface; the per-module isolation of the refactorer bounds blast radius)

## Approval

- Approved by: N/A (not a critical-level change)
- Date: N/A

## Overall Verdict: NEEDS_REVISION

---

## Spec Review

### Constraint Checklist

| # | Requirement | Type | Status | Evidence |
|---|-------------|------|--------|----------|
| R1 | Refactor-Step-Generation | ADDED | PASS | `src/templates/workflows/registry.ts:38`; `src/integrations/omp/commands.ts:33`; `src/integrations/{claude-code,opencode}/commands.ts`, `src/integrations/{agent,codex}/skills.ts` |
| R2 | Refactor-Analyzer-Contract | ADDED | FAIL | `src/core/refactor-analyzer.ts:350` implements all metrics, but scenario "threshold overrides change the findings" has no test coverage (see R2 below) |
| R3 | Refactorer-OMPSub-Agent-Discrimination | ADDED | PASS | `src/integrations/omp/extension-runtime.ts:100,210-221` + `src/templates/omp/extension.tmpl.ts:63,173-181` (mirror kept in lockstep) |
| R4 | Refactor-Workflow-Template | ADDED | PASS | `src/templates/workflows/refactor.ts:12-71` dual export; four sections; five steps; standalone guardrails |
| R5 | Refactorer-Agent-Prompt | ADDED | PASS | `src/templates/agents/index.ts:932` `REFACTORER_PROMPT`; `AGENT_PROMPTS['refactorer']` registered |
| R6 | Refactorer-Behavior-Preservation | ADDED | FAIL | `src/commands/bp-dispatch.ts:101` declares `--target` optional and `dispatchHandler` never validates it — "rejects unscoped targets" scenario unmet (see R1 below) |

### Scenario Coverage

| Scenario | Test Location | Status |
|----------|--------------|--------|
| refactor step generates across all five platforms | `src/generators/multi-platform.test.ts:55` | PASS |
| bp refactor CLI prints step instructions / empty target / missing project | `src/commands/bp-refactor.test.ts:26,38,47` | PASS |
| analyzer emits structured report and stdout summary | `tests/integration/refactor-flow.test.ts:153` | PASS |
| threshold overrides change the findings | - | MISSING |
| analyzer is deterministic | `src/core/refactor-analyzer.test.ts:196`; `tests/integration/refactor-flow.test.ts:180` | PASS |
| analyzer reuses or refreshes the codebase map | `tests/integration/refactor-flow.test.ts:153` (indirect, stale-map rebuild path) | PASS |
| report file path is `.refactor-report.md` inside `bp/` | `src/core/refactor-analyzer.test.ts:210` | PASS |
| detectAgentType recognizes refactorer / falls back to default | `src/integrations/omp/extension-runtime.test.ts:40,48`; `tests/integration/omp-extension.test.ts:128` | PASS |
| dual-export template + registry resolution + lifecycle forbidden | `src/templates/workflows/refactor.test.ts:6,32,43` | PASS |
| REFACTORER_PROMPT sections / AGENT_PROMPTS / guardrails | `tests/templates/agents-refactorer.test.ts` | PASS |
| platform generators render the refactorer body | `src/generators/multi-platform.test.ts:71`; agent snapshots | PASS |
| per-module dispatch with executor isolation | `tests/commands/bp-dispatch.test.ts:101`; `tests/integration/refactor-flow.test.ts:194` | PASS |
| refactorer dispatch rejects unscoped targets | - | MISSING |
| spec sync stays inside affected domains | `REFACTORER_PROMPT` Guardrails (`src/templates/agents/index.ts:983-989`) — agent-runtime contract, prompt-constrained | PASS |

### Spec Verdict: NEEDS_REVISION

---

## Quality Review

### Issues

| # | Severity | Category | Location | Description | Fix |
|---|----------|----------|----------|-------------|-----|
| Q1 | MINOR | Convention/Design | `src/templates/workflows/refactor.ts:9-10` | context.jsonl row 9 reason ("CONTEXT_JSONL_REMINDER shared block for orchestrator instructions") is not satisfied: DS-1 says the body is built from `ORCHESTRATOR_RULE` AND `CONTEXT_JSONL_REMINDER`, but `refactor.ts` imports only `ORCHESTRATOR_RULE`. `propose.ts:5` includes the block; refactor omits it, so the generated `bp-refactor` body never tells the orchestrator that context is auto-injected by the OMP Extension. | Include `${CONTEXT_JSONL_REMINDER}` in the refactor body (matching DS-1 / propose.ts) or update context.jsonl row 9 to reflect the omission. |
| Q2 | MINOR | Design | `src/commands/bp-refactor.ts:22` | Design DS-4 / Interface Design (`design.md:463-464`) documents `bp refactor <target> [--format=full|short]`; the implementation registers only `--change` and no `--format` option. | Add the `--format full|short` option or update design.md to drop it. |
| Q3 | MINOR | Design | `src/core/refactor-analyzer.ts:135-141`; `src/commands/bp-refactor.ts:96` | Design DS-5 error paths (`design.md:484`) say `runRefactorAnalyzer` throws `MiNotFoundError` when the target resolves to no module (CLI → exit 1). Implementation returns an empty `perModule` and the CLI exits 0 with "No modules analyzed." — a typo'd target (`bp refactor analyze src/typo`) silently reports success with zero findings. | Throw `MiNotFoundError` when `selectModules` yields no module for a non-`.` target; CLI maps to exit 1. |
| Q4 | MINOR | Test coverage | `src/core/refactor-analyzer.test.ts:153` | No test exercises a threshold override changing analyzer findings (platform-gen delta scenario "threshold overrides change the findings"). All analyzer tests pass `DEFAULT_REFACTOR_THRESHOLDS`. | Add a test running `runRefactorAnalyzer` with `fragmentation.exportsMax: 5` (or `duplication.similarityMin`) and asserting the finding set changes. |

### Convention Compliance

- TS strict, ESM, kebab-case filenames (`refactor-analyzer.ts`, `bp-refactor.ts`), `.js` import extensions, Zod config validation: all conform to `bp/conventions/coding.md`.
- Commit scopes used correctly (`feat(commands)`, `feat(core)`, `refactor(integrations)`, `docs(...)`).
- OMP extension template mirror (`src/templates/omp/extension.tmpl.ts`) was updated in lockstep with `extension-runtime.ts` (the file's own WARNING contract) — verified in the diff.
- Task completion: all 16 tasks `[x]` with commit hashes present in git history; pre-archive checklist complete.

---

## Goal Review

### Goal Checklist

| # | Deliverable | Status | Evidence |
|---|-------------|--------|----------|
| G1 | PR-1: Refactor workflow step (slash command + skill on all platforms) | ACHIEVED | `WORKFLOW_REGISTRY['refactor']` (`registry.ts:38`); `bp-refactor` generated on omp/claude-code/opencode/agent/codex (multi-platform test + snapshots); `bp refactor <target>` prints instructions only (`bp-refactor.ts:31-47`) |
| G2 | PR-2: Deterministic refactor analyzer (`bp refactor analyze <target>`) | PARTIAL | All four metrics + depth ratio computed deterministically (`refactor-analyzer.ts`); report + stdout summary + configurable thresholds implemented. Two gaps: (a) duplication is scanned per-module only, so cross-module duplicated blocks — the proposal's stated core problem ("copy-pasted across modules") — are never reported (`refactor-analyzer.ts:373` calls `duplicationPairs(rootDir, files, thresholds)` with each module's own files); (b) the threshold-override behavior is untested (Q4). |
| G3 | PR-3: Refactorer sub-agent (behavior-preserving consolidation + spec sync) | ACHIEVED | `REFACTORER_PROMPT` with behavior-preservation + spec-sync guardrails (`agents/index.ts`); agent files on all four agent platforms; `bp dispatch refactorer` reuses executor isolation (`bp-dispatch.ts:118-120`); OMP `detectAgentType('refactorer')` + `## Refactor Targets` augmentation |
| G4 | PR-4: Global spec documentation of the refactor workflow | ACHIEVED | Delta specs in all three domains; `docs/platform-integration.md:164` `## Refactor step` section |

### Goal Verdict: NEEDS_REVISION

---


## Review History

| Round | Date | New Issues | Blockers | Verdict |
|-------|------|------------|----------|---------|
| 1 | 2026-08-07 | 6 | 0 | NEEDS_REVISION |

## Issues

- [ ] R1 - `bp dispatch refactorer` without `--target` does not reject: general delta spec scenario "refactorer dispatch rejects unscoped targets" (stderr usage + exit 1) is unmet; `--target` is optional (`src/commands/bp-dispatch.ts:101`) and never validated in `dispatchHandler` — verified: `node bin/cli.js dispatch refactorer` exits 0 and prints a dispatch block (spec)
- [ ] R2 - platform-gen delta scenario "threshold overrides change the findings" has no test coverage; all analyzer tests use `DEFAULT_REFACTOR_THRESHOLDS` (`src/core/refactor-analyzer.test.ts:153`) (spec)
- [ ] Q1 - context.jsonl row 9 reason stale: refactor template omits `CONTEXT_JSONL_REMINDER` that DS-1 and the row require (`src/templates/workflows/refactor.ts:9-10`) (quality)
- [~] Q2 - `--format full|short` documented in design DS-4 is not implemented (`src/commands/bp-refactor.ts:22`) (quality)
- [~] Q3 - nonexistent target silently exits 0 with "No modules analyzed." instead of the design's `MiNotFoundError` → exit 1 (`src/core/refactor-analyzer.ts:135-141`, `src/commands/bp-refactor.ts:96`) (quality)
- [ ] G1 - PR-2 duplication metric only scans within each module, so cross-module duplicated blocks (the proposal's core "copy-pasted across modules" problem) are never detected (`src/core/refactor-analyzer.ts:373`) (goal)

## Routing

- **D issues**: 0 (none)
- **R/Q/G issues**: 6 (R1, R2, Q1, Q2, Q3, G1)

**Recommendation**: `bp apply refactor-command --fix`
<!-- Advisory only. Orchestrator MUST ask the user before archiving, regardless of this recommendation. -->
