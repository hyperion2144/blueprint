# Review: workflow-reform

<!--
  Triple review result. Produced by the reviewer agent.
  This is the gate between apply and archive.

  Three dimensions:
  1. Spec Review (Spec Gate): delta spec requirements vs implementation
  2. Quality Review (Quality Gate): code bugs, security, conventions
  3. Goal Review (Goal Gate): proposal deliverables vs implementation

  Issue prefixes:
  - R/Q/G/D-N: issue -> check step dispatches bp-fixer then a full re-review

  Verdict rules:
  - Zero issues -> PASS
  - Any D issue -> FAIL
  - Any BLOCKER severity -> FAIL
  - Only R/Q/G (no D, no BLOCKER) -> NEEDS_REVISION
-->


## Level Assessment

- **Proposal Level**: critical
- **Reviewer Assessment**: critical
- **Escalation**: none (declared level matches actual risk — core-path renames of two lifecycle commands plus a new sub-agent role and a changed fix-loopback/archive contract; a missed reference bricks the daily workflow, and the audit below confirms real missed references exist)

## Approval

- Approved by: N/A — `config.approvers` is empty (approver gate not configured per 7.2.5)
- Date: N/A

## Overall Verdict: PASS

---

## Spec Review

### Constraint Checklist

| # | Requirement | Type | Status | Evidence |
|---|-------------|------|--------|----------|
| R1 | Check-Step-Rename | ADDED | PASS | src/templates/workflows/registry.ts:33 (key `check`, no `review`); src/core/schema.ts:112 (`check` before `archive`); src/commands/bp-check.ts:20; bp-check command verified live; `review.md` artifact preserved (src/templates/workflows/check.ts:67; FILENAMES.review src/commands/bp-template.ts:34) |
| R2 | Fixer-Agent-Role | ADDED | PASS | src/templates/agents/index.ts:646 (FIXER_PROMPT) + :696 (`fixer` in AGENT_PROMPTS); no `bp fix` command (src/cli.ts grep); platform bp-fixer.md files generated (.claude/agents/bp-fixer.md, .omp/agents/bp-fixer.md, .agent/agents/bp-fixer.md, .opencode via generator) |
| R3 | Reviewer-Full-Review | ADDED | PASS | src/templates/agents/index.ts:367-512 — no `## Fix Mode`, no `--fix`, no `[~]`; `check every row's \`reason\` is still satisfied` at :404; Step 0 full-review statement :416 |
| R4 | Check-Step-Full-Rereview | ADDED | PASS | src/templates/workflows/check.ts:49-57 (non-PASS → `bp dispatch fixer --change $1` → full re-review, "Do NOT re-check only the fixed issues"); src/core/continue.ts:265-298 (non-PASS verdict → `bp check`, no `plan --fix`/`apply --fix`) |
| R5 | Finish-Command | ADDED | PASS | src/commands/bp-finish.ts:24 (`finish [name]`); `bp finalize` unknown (verified live exit non-zero); error messages reference `bp check` (:116, :128, :135) |
| R6 | Archive-Check-Step | ADDED | PASS | src/templates/workflows/archive.ts:35-40 (Step 3 archive-check ADD/MODIFY) before Step 4 `bp finish $1` (:44); no `bp finalize` substring |
| R7 | Propose-Grilling-First | ADDED | PASS | src/templates/workflows/propose.ts:26-40 (Step 1 grill, one question at a time + recommended answer) before Step 3 template fetch (:53-65); trivial/light skip :28 |
| R8 | Design-Item-Contract-Fields | ADDED | PASS | src/templates/artifacts/index.ts:262-264 (Requirements/Constraints/Acceptance Criteria); PLANNER_PROMPT :123 + :207; plan.ts Step 4 Dimension 1 :44 |
| R9 | Roadmap-Lightweight-Grilling | ADDED | PASS | src/templates/workflows/roadmap.ts:9-20 (lightweight grilling, defers detail to propose) |
| R10 | Prompt-Simplification | ADDED | PASS | all 11 templates keep `## Input`/`## Steps`/`## Output`/`## Guardrails` in order (verified via grep); asserted keywords survive (`auto-injected by the OMP Extension` in shared.ts:27, `behavior preserv` :601, `STOP after ONE module` :643, `write \`context.jsonl\`` :73, `check every row's` :404); 453 tests pass |
| R11 | Refactor-Workflow-Template | MODIFIED | PASS | src/templates/workflows/refactor.ts:66 (guardrail "plan/apply/check/archive", no `bp review`); explicit human confirmation Step 2 :30-37; no lifecycle artifact paths mentioned |
| R12 | Check-Phase-Value (context) | ADDED | PASS | src/types/context-jsonl-io.ts:3 CONTEXT_PHASES; _utils.ts:87 gate union; artifact-validator.ts:36 |
| R13 | Step-Scoped Context (context) | MODIFIED | PASS | change-steps naming satisfied via CONTEXT_PHASES / DEFAULT_SCHEMA steps / platform STEPS arrays (all name `check`); scenario "change step gets change artifacts" implemented via spec-injector.ts:46-55 `if (changeName)` |
| R14 | Change-Verification-Step-Naming / State Transitions (state) | ADDED+MODIFIED | PASS | src/commands/bp-state.ts:171 (`bp check` nextAction); verified live `bp state --json` → `bp check demo2`; no standalone fix/replan/reapply transitions |
| R15 | Finish-Command / Archive-Check-Step / Archive Command Input / Missing Change Error (archive) | ADDED+MODIFIED | PASS | bp-finish.ts; archive.ts Step 3/4; `bp finish` dry-run + full archive verified live |
| R16 | DS-N-Contract-Fields (plan-review) | ADDED | PASS | design template fields; planner prompt; plan.ts Step-4 Dimension 1; `bp template design --stdout` verified live |
| R17 | Fixer-Platform-Generation / Fixer-Dispatch-Isolation / OMP Sub-Agent Discrimination (platform-gen) | ADDED+MODIFIED | PASS | extension-runtime.ts:101 (detectAgentType fixer), :190 (executor\|fixer render branch); extension.tmpl.ts:64/:154 mirror in lockstep; isExecutorLike fixer bp-dispatch.ts:119-121; ROLE_TEMPLATES.fixer=[] :59; 4 agent generators emit fixer (verified) |

### Scenario Coverage

| Scenario | Test Location | Status |
|----------|--------------|--------|
| registry exposes check and not review | tests/core/continue.test.ts:231-235 | PASS |
| check command prints the check instructions / review unknown | tests/commands/bp-check.test.ts:38-54 | PASS |
| review artifact file name is preserved | tests/templates/workflow-apply-review.test.ts:21-25 | PASS |
| fixer role is a sub-agent only | tests/templates/agents-fixer.test.ts:7-37 | PASS |
| platform agent files include bp-fixer | src/generators/multi-platform.test.ts:90-104 | PASS |
| reviewer prompt has no fix mode / re-validates context rows | tests/templates/agents-reviewer.test.ts:11-13 | PASS |
| non-PASS verdict routes to fixer then full re-review | tests/integration/check-fixer-rereview.test.ts:39-55 | PASS |
| continue routes non-PASS verdicts to check | tests/core/continue.test.ts:176-206 | PASS |
| finish archives end-to-end / finalize not a command | tests/commands/bp-archive.test.ts:71; live CLI verified | PASS |
| finish error messages reference check | src/commands/bp-finish.ts:116,128,135 | PASS |
| archive-check step precedes finish | tests/integration/archive-check-finish.test.ts:31-59 | PASS |
| delta specs reconciled before finishing (ADD/MODIFY merge) | tests/integration/archive-check-finish.test.ts:61-125 | PASS |
| grilling precedes template fetch | tests/templates/workflow-propose.test.ts | PASS |
| design template includes the three fields / plan step verifies | tests/templates/design-contract-fields.test.ts; bp template design live | PASS |
| roadmap grilling is lightweight | tests/templates/workflow-roadmap.test.ts | PASS |
| simplification preserves structure + keywords | workflow-apply-review.test.ts; agents-*.test.ts; 453 tests green | PASS |
| phase enum uses check / check gates on check phase | tests/core/context-phase.test.ts:33-79 | PASS |
| OMP detectAgentType recognizes fixer / fixer session augments rows / ES5 mirror | src/integrations/omp/extension-runtime.test.ts:84-130 | PASS |
| dispatch fixer uses executor isolation | tests/commands/bp-dispatch.test.ts:156-210 | PASS |
| bp template check / review artifact template | tests/commands/bp-template.test.ts:31-43 | PASS |

### Spec Verdict: PASS

---

## Quality Review

### Issues

| # | Severity | Category | Location | Description | Fix |
|---|----------|----------|----------|-------------|-----|
| Q1 | BLOCKER | Bug (self-gate failure) | bp/changes/workflow-reform/context.jsonl:19,23,25 | Three context.jsonl rows reference files deleted by this change (`src/templates/workflows/review.ts`, `src/commands/bp-review.ts`, `src/commands/bp-finalize.ts`), all with `phase: all`. The context gate (`gateContextJsonl`) validates phase-`all` rows for `check` and `archive`, so `bp check workflow-reform`, `bp finish workflow-reform --dry-run`, and `bp finish workflow-reform` all deterministically exit 2 (`PATH_UNRESOLVED`). The change cannot be reviewed or archived with its own reformed commands — the terminal archive step is unreachable. Also a context-re-validation failure: the reasons cited files that no longer encode the invariants. | Update the three rows' `file` to the renamed modules (`src/templates/workflows/check.ts`, `src/commands/bp-check.ts`, `src/commands/bp-finish.ts`) so the check/archive gates pass; then re-validate with `bp check workflow-reform` (exit 0). |
| Q2 | MAJOR | Convention (stale docs) | README.md:55,74,144,154; AGENTS.md:62,155; bp/roadmap.md:32 | User-facing docs still document the removed command surface: `bp review my-change` (README Quick Start + CLI table + mermaid `/bp review/`), and "Fix loops use `--fix` flag: `bp plan --fix` or `bp apply --fix`" (README:154, AGENTS.md:62/155), plus `bp review` in roadmap M1 Outcome. `bp review` is now an unknown command and the `--fix` flags no longer exist. The reform's risk register explicitly promised grepping docs for these references; README/AGENTS/roadmap were missed, and `bp check`/`bp finish` are absent from the CLI reference. | Update README Quick Start/CLI table/mermaid to `bp check` + add `bp finish`; rewrite the fix-loop note to the check→fixer→full re-review flow; update AGENTS.md and bp/roadmap.md:32. |
| Q3 | MINOR | Convention (stale comment) | src/commands/bp-context.ts:5 | Header comment still lists the workflow steps as "(plan / apply / review / archive)". | Change `review` to `check` in the comment. |
| Q4 | MINOR | Convention (stale artifact) | src/integrations/claude-code/__snapshots__/skills.test.ts.snap | Orphaned 2087-line snapshot with no corresponding `skills.test.ts` (last written by v1-era commits, unchanged in this change range). It retains v1 content including `bp:review`, `bp:fix-apply`, `bp:fix-plan`, `--fix` re-review instructions — exactly the removed surface. Not executed by any test (harmless at runtime) but contradicts the "no `--fix` / no `bp review` remains" cleanliness of the reform. | Delete the orphaned snapshot (it is not regenerated by any current test). |
| Q5 | INFO | AI-Smell (dead data) | src/core/continue.ts:134-152,379; src/types/state.ts:36 | `readReviewStatus` still computes `hasDesignIssues` (D-issue count) and exposes it on `ChangeProgress`, but D-vs-R/Q/G routing was deliberately collapsed to `bp check` (D-4), so the field is now write-only for the routing logic. | Leave or remove; if removed, also drop the field from `ChangeProgress`/`state.ts`. Non-blocking. |

### Convention Compliance

TypeScript strict, ESM `.js` imports, kebab-case files, UPPER_SNAKE_CASE template constants, lowercase markdown, conventional commits — all confirmed in the changed files. The stale-doc drift (Q2/Q3/Q4) is resolved in Round 2.

### Round 2 — Fix Verification (dd8779b..HEAD)

| Issue | Status | Evidence |
|-------|--------|----------|
| Q1 (BLOCKER) | FIXED | context.jsonl rows 19/23/25 repointed to `src/templates/workflows/check.ts` / `src/commands/bp-check.ts` / `src/commands/bp-finish.ts` (d6c0ed4); reasons still encode real invariants (check.ts:52-55 fixer loopback + full re-review; bp-check.ts/bp-finish.ts exist as CLI commands). `bp check workflow-reform` exits 0; `bp finish workflow-reform --dry-run` exits 0 with all 6 delta specs merging without conflict |
| Q2 (MAJOR) | FIXED | README.md (Quick Start, CLI table, Change Loop, mermaid diagram, `--fix` note → fixer loopback, `bp finish` added), AGENTS.md (change loop, feedback loop, directory/code-map tables), bp/roadmap.md:32 Outcomes line — all updated to `bp check`/`bp finish` + fixer loopback (e81e30c, cd84723) |
| Q3 (MINOR) | FIXED | src/commands/bp-context.ts:5 comment now "(plan / apply / check / archive)" (22e56f7) |
| Q4 (MINOR) | FIXED | orphaned src/integrations/claude-code/__snapshots__/skills.test.ts.snap (2087 lines) deleted (5879a81); no generating test references it; 453 tests green |
| Q5 (INFO) | FIXED | `hasDesignIssues` removed from readReviewStatus/ChangeProgress (src/core/continue.ts, src/types/state.ts, b7b0fe5); zero remaining references in src/ or tests/ |
| Q6 (MINOR, NEW) | OPEN | stale sub-agent role enumerations — README.md:7,:35-38 ("4 specialized sub-agents: planner, executor, reviewer, codebase-scanner") and AGENTS.md:5,:75,:168 ("sub-agents (planner, executor, reviewer)" / "All 3 sub-agent system prompts") undercount: src/templates/agents/index.ts AGENT_PROMPTS now has 6 roles (planner, executor, reviewer, codebase-scanner, refactorer, fixer). The `fixer` role this change adds is absent from every enumeration; `refactorer` (prior change) too. README:74 (this change) mentions the fixer in the check row but the headline counts were not updated |

Additional regression audit of the fixes:

- **54cde55 (agent frontmatter)** — `tools: ['edit','write','bash']` dropped from the `refactorer`/`fixer` AGENT_DEFs in the omp/claude-code/agent generators, made consistent with every other role (`tools: []`, which renders no `tools:` frontmatter). Generated `.claude/agents/bp-fixer.md`, `.omp/agents/bp-fixer.md`, `.agent/agents/bp-fixer.md` frontmatter is valid (`name`/`description`/`effort`, no invalid `tools:` field); snapshots regenerated; suite green. No regression.
- **2c93b02 (global-spec restructure)** — ASSESSMENT: acceptable. Content-preserving (2 insertions / 0 deletions per file; only `## Requirements` heading inserted before the existing `### Requirement:` blocks in bp/specs/{archive,context,state}/spec.md). It was a necessary pre-archive sync: `semanticMerge` (src/core/delta-merge.ts:122-126) only indexes requirements under a `## Requirements` section, so this change's MODIFIED delta specs could never merge otherwise (the exact Q1 self-gate failure). Verified by `bp finish --dry-run` exit 0. It does not violate the archive-check "never edit bp/specs/ directly" scenario — that scenario governs the archive *workflow step's* write scope, not a structural repair of a broken merge substrate. Pre-existing structural note (out of scope): 5 other global specs (config, file-tree, init, specs-engine, update-conventions) still nest requirements under `## Purpose` with no `## Requirements` section — a latent merge-conflict hazard for any future change that MODIFIEDs requirements in those domains.
- **Stale `bp review` (as a step/command)**: no live doc or code reference remains. The only hits are (a) `src/templates/workflows/refactor.test.ts:61` (positive `not.toContain('bp review')` assertion) and (b) `DESIGN-v3.md:54` — a historical v3-telemetry design proposal for roadmap M2/M3 work that is explicitly OUT of scope for this change; treated as archival, not a finding.
- **Dead-code removal side effects**: none. `hasDesignIssues` removal is clean; snapshot deletion removes no live test fixture.
- **Docs wording regressions**: none found. README/AGENTS wording is accurate (bp archive remains a real step command printing archive steps; bp finish executes).

---

## Goal Review

### Goal Checklist

| # | Deliverable | Status | Evidence |
|---|-------------|--------|----------|
| G1 | PR-1: Rename review step to check (artifact stays review.md) | ACHIEVED | `bp check demo` prints check instructions (live); `bp review` unknown (live + bp-check.test.ts:50); `bp continue`/`bp state` route to `bp check` (continue.test.ts:146-154, live `bp state`); review.md artifact preserved (`bp template review --stdout` → `# Review:`); registry/schema/6 platform generators updated |
| G2 | PR-2: bp-fixer sub-agent + full re-review in the check step | ACHIEVED | `bp dispatch fixer --change demo` emits a bp-fixer block (live); AGENT_PROMPTS['fixer'] non-empty; bp-fixer.md on 4 platforms; reviewer prompt has no fix mode; check template routes non-PASS → fixer → full re-review; integration test check-fixer-rereview |
| G3 | PR-3: Archive reform — finalize→finish + orchestrated archive check | ACHIEVED | `bp finish demo` archived end-to-end (live); `bp finalize` unknown (live); archive template Step 3 archive-check before `bp finish $1`; archive-check-finish test merges ADD/MODIFY; bp/specs/archive/spec.md repaired (no `blueprint archive`, uses `bp finish`/`bp check`) |
| G4 | PR-4: Planning quality — grilling-first propose + DS-N requirements/constraints/acceptance | ACHIEVED | propose Step 1 grill before template fetch; `bp template design --stdout` shows the three fields; PLANNER_PROMPT instructs filling them; plan Step-4 Dimension 1 checks presence |
| G5 | PR-5: Roadmap lightweight grilling | ACHIEVED | roadmap Step 1 lightweight grilling (direction + milestone agreement, defers detail to propose) |
| G6 | PR-6: Prompt simplification across all templates and agents | ACHIEVED | all 11 templates + 6 agent prompts trimmed; headers preserved in order; asserted keywords intact; 453 tests green; snapshots regenerated deliberately |

### Goal Verdict: PASS

---


## Review History

| Round | Date | New Issues | Blockers | Verdict |
|-------|------|------------|----------|---------|
| 1 | 2026-08-08 | 5 | 1 | FAIL |
| 2 | 2026-08-08 | 1 | 0 | NEEDS_REVISION |
| 3 | 2026-08-08 | 0 | 0 | PASS |

## Issues

- [x] Q1 - context.jsonl rows 19/23/25 cite deleted files (review.ts, bp-review.ts, bp-finalize.ts) — `bp check` and `bp finish` on this change both exit 2, blocking review and archive (BLOCKER, context re-validation) (quality) **FIXED (d6c0ed4)** — rows repointed to check.ts / bp-check.ts / bp-finish.ts; `bp check workflow-reform` exits 0 and `bp finish workflow-reform --dry-run` exits 0 (all 6 delta specs merge without conflict)
- [x] Q2 - README.md:55,74,144,154 / AGENTS.md:62,155 / bp/roadmap.md:32 still document removed commands `bp review` + `bp plan --fix`/`bp apply --fix` and omit `bp check`/`bp finish` (MAJOR, stale docs) (quality) **FIXED (e81e30c, cd84723)** — README Quick Start/CLI table/change-loop/mermaid and fix-loop note, AGENTS.md change-loop/feedback-loop/tables, roadmap Outcomes line all updated to bp check / bp finish + fixer loopback
- [x] Q3 - src/commands/bp-context.ts:5 header comment lists "(plan / apply / review / archive)" (MINOR) (quality) **FIXED (22e56f7)** — comment now lists check
- [x] Q4 - orphaned snapshot src/integrations/claude-code/__snapshots__/skills.test.ts.snap retains v1 `--fix` / `bp:review` / `bp:fix-apply` content, no generating test (MINOR) (quality) **FIXED (5879a81)** — snapshot deleted; no test references it; 453 tests green
- [x] Q5 - hasDesignIssues now dead data after D-vs-R/Q/G routing collapse (INFO, suggestion only) (quality) **FIXED (b7b0fe5)** — field removed from readReviewStatus/ChangeProgress; zero remaining references
- [x] Q6 - README.md:7,:35-38 ("4 specialized sub-agents: planner, executor, reviewer, codebase-scanner") and AGENTS.md:5,:75,:168 ("sub-agents (planner, executor, reviewer)" / "All 3 sub-agent system prompts") undercount the sub-agent roster: src/templates/agents/index.ts AGENT_PROMPTS now has 6 roles (planner, executor, reviewer, codebase-scanner, refactorer, fixer). The `fixer` role added by this change is absent from every enumeration (as is the prior `refactorer`), while README:74 (updated by this change) already mentions the fixer in the check row. (MINOR, stale docs) (quality) **FIXED (orchestrator trivial check)** — README:7/:35-38/:115 and AGENTS.md:5/:75/:136/:168/:247 now enumerate all 6 roles (planner, executor, reviewer, codebase-scanner, refactorer, fixer); README Profiles table "Parallel (3 agents)" is a profile-concurrency description, not a roster count (left).

## Routing

- **D issues**: 0 (none)
- **R/Q/G issues**: 0 (all closed — Q1-Q5 verified in Round 2; Q6 verified in Round 3)

**Recommendation**: archivable — `bp archive workflow-reform` (all 6 issues Q1-Q6 closed; 0 D, 0 BLOCKER, verdict PASS)
<!-- Advisory only. Orchestrator MUST ask the user before archiving, regardless of this recommendation. -->
