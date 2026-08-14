# Review: add-design-workflow

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

- **Proposal Level**: standard
- **Reviewer Assessment**: same
- **Escalation**: none. Cross-module but mechanical, fully test-covered except one uncovered runtime path (see R1). Standard rigor is sufficient; no escalation to Critical.

## Approval

- Approved by: n/a (not a Critical-level change; config.approvers not consulted)
- Date: 2026-08-15

## Overall Verdict: PASS

---

## Spec Review

### Constraint Checklist

| # | Requirement | Type | Status | Evidence |
| --- | ------------- | ------ | -------- | ---------- |
| R1 | Design-Step-Templates (5 registry steps, self-contained instructions, no `': '`, plan-design-review UI-audit-only) | ADDED | PASS | src/templates/workflows/registry.ts:44-48 (16 keys); design.ts:11-86 + design-html/review/shotgun/plan-design-review.ts share one instructions string for skill+command, four headers in order, no `{{`, no gstack/Pretext tokens (provenance comment only); descriptions match DS-1 table (no colon+space); plan-design-review.ts:23-58 UI-audit-only (no platform gates / codex voice / EXIT machinery) |
| R2 | Designer-Sub-Agent (AGENT_PROMPTS['designer'], 6 sections, `Design Consultant` marker, disjoint from planner, artifact-bound guardrails) | ADDED | PASS | src/templates/agents/index.ts:700-762 (DESIGNER_PROMPT, six sections in order, marker line 703, `${AGENT_CONSTRAINTS}` embedded, guardrails forbid source edits + direct outputs to DESIGN.md/design-review.md/design/); line 766 registration; planner title `Change Design Specialist` (line 23) disjoint |
| R3 | Designer-Dispatch-And-Model-Tier (per-platform dispatch, `bp template design-system` listed, designer model tier default=planner, config override) | ADDED | PASS | src/commands/bp-dispatch.ts:61 `designer: ['design-system']` (only change; FORMATS/EXECUTOR_ISOLATION untouched); src/types/config.ts:75/82/89/96 designer tier mirrors planner; live-verified `bp dispatch designer` prints 4 `## Dispatch: bp-designer (<platform>)` sections + `Read-only role — no isolation needed.` + `Role: designer` + `Model: pi/plan`; temp-config `models.designer: gpt-4o-design` → printed `Model: gpt-4o-design` |
| R4 | Design-CLI-Commands (5 commands, optional change-name, exit 0 in-project / exit 1 with exact stderr outside) | ADDED | PASS | src/commands/bp-design*.ts ×5 mirror bp-refactor pattern (findBpDir gate → getWorkflowInstructions → print); src/cli.ts:28-32 imports + 70-74 register calls; live-verified: `bp --help` lists all five, `bp design` prints `## Steps`/`## Output`/`## Guardrails` exit 0, outside project stderr `Not in a blueprint project. Run "bp init" first.` exit 1 |
| R5 | Platform-Design-Step-Generation (design skills/commands for every configured platform; bp-designer.md from every agent generator; byte-identical bodies; deterministic) | ADDED | PASS | Generators correct (pi/skills.ts STEPS 16, omp/skills.ts 15 no-refactor, omp/commands.ts 5 defs `agents:['designer']`, claude-code/commands.ts 16, codex/skills.ts 16, agent/skills.ts 16; pi/omp/agent/claude-code agents.ts 7 roles incl. designer; opencode source untouched — 0 diff). Round 1 FAIL (`.agent/skills` deleted the 5 design skills via the v2Steps whitelist) FIXED at root: bp-update.ts:109-123 now uses the generatedSet-based check (v2Steps whitelist deleted, commit 33ec7c6); regression test tests/commands/bp-update.test.ts:102-123 (RED f9d4c0a → GREEN 33ec7c6); live `bp update` in this repo leaves `.agent/skills/` at 16 dirs incl. all five `bp-design*`, zero `Removed stale` lines for design |
| R6 | Designer-Agent-Type-Detection (detect `designer` from `Design Consultant` marker, runtime + template lockstep, paths-only block) | ADDED | PASS | src/integrations/pi/extension-runtime.ts:40 (AgentType), :108 (marker), :225 (explicit else-if); src/templates/pi/extension.tmpl.ts:94 + :178 (lockstep); tests: extension-runtime.test.ts:116/135 (detection), :119 (disjointness for every shipped prompt), :201-206 (paths-only block, no `## Roadmap State`/`## Invariants`); behaviorally the marker exists in both files (lockstep test gap = Q1) |
| R7 | Design-System-Artifact (`## Design System` shape, no unsubstituted `{{`, writes root DESIGN.md) | ADDED | PASS | src/templates/artifacts/design-system.ts:11+ (all 8 subsections at lines 19-47, only {{name}}/{{date}} tokens); index.ts:1058 registration; bp-template.ts:38 FILENAMES; live-verified `bp template design-system --stdout` prints shape with 0 `{{` remaining |
| R8 | Design-Review-Artifact-Tolerance (validateChange valid, continue identical with/without design-review.md) | ADDED | PASS | src/core/artifact-validator.ts:264 known-artifact entry; src/core/continue.ts NOT modified (verified 0 diff); tests/core/design-review-tolerance.test.ts:47+56 (validate + byte-identical continue output) |
| R9 | Core-Loop-Advisory-Hooks (plan suggests `bp plan-design-review`, check suggests `bp design-review`, no gate) | ADDED | PASS | src/templates/workflows/plan.ts:27 advisory bullet; check.ts:34 advisory sentence; both explicitly "Advisory only; it does not gate"; tests/templates/workflow-advisory-hooks.test.ts:28-47 (substrings + no-MUST guard + structure intact) |
| R10 | platform-gen MODIFIED counts (pi 16 skills/7 agents, codex 16, agent 16, claude 16 commands/7 agents, omp 16 commands/15 skills) | MODIFIED | PASS | Count-pin tests updated and green (pi/index.test.ts:45 pins 24 files; pi/skills/agents, codex, agent, claude-code pins 16/7); design-step-generation.test.ts:34-102; regenerated snapshots pass in full suite |

### Scenario Coverage

| Scenario | Test Location | Status |
| ---------- | -------------- | -------- |
| registry exposes the five design steps | tests/templates/workflow-design-steps.test.ts:39 | PASS |
| design instructions are self-contained | tests/templates/workflow-design-steps.test.ts:62 | PASS |
| descriptions avoid the colon trap | tests/templates/workflow-design-steps.test.ts:71 | PASS |
| plan-design-review is UI-audit only | tests/templates/workflow-design-steps.test.ts:102 | PASS |
| designer prompt is registered and structured | tests/templates/agents-designer.test.ts:34-66 | PASS |
| designer marker is disjoint from planner | tests/templates/agents-designer.test.ts:46,59 | PASS |
| designer is artifact-bound, not source-bound | tests/templates/agents-designer.test.ts:63 | PASS |
| dispatch designer prints per-platform instructions | tests/commands/bp-dispatch.test.ts:231 + live run | PASS |
| designer template list and model override | tests/commands/bp-dispatch.test.ts + live (gpt-4o-design) | PASS |
| design commands print instructions | tests/commands/bp-design-commands.test.ts + live | PASS |
| design commands fail cleanly outside a project | tests/commands/bp-design-commands.test.ts + live (exit=1) | PASS |
| every configured platform emits the design steps | tests/integrations/design-step-generation.test.ts:34 (generator-level) + live `bp update` dogfood: `.agent/skills/` 16 dirs incl. all five design skills | PASS |
| agent generators emit the designer role | tests/integrations/design-step-generation.test.ts:64 | PASS |
| generation stays deterministic | tests/integrations/design-step-generation.test.ts + pi/index.test.ts:81 | PASS |
| designer marker is detected | src/integrations/pi/extension-runtime.test.ts:116,135 | PASS |
| detection stays disjoint | src/integrations/pi/extension-runtime.test.ts:119 | PASS |
| design-system template renders the DESIGN.md shape | tests/commands/bp-template.test.ts + live | PASS |
| non-stdout output targets root DESIGN.md | tests/commands/bp-template.test.ts | PASS |
| design-review.md is a recognized optional artifact | tests/core/design-review-tolerance.test.ts:47 | PASS |
| absence of design-review.md does not block continue | tests/core/design-review-tolerance.test.ts:56 | PASS |
| plan step suggests the plan-phase UI audit | tests/templates/workflow-advisory-hooks.test.ts:28 | PASS |
| check step suggests the design review | tests/templates/workflow-advisory-hooks.test.ts:34 | PASS |

### Spec Verdict: PASS

---

## Quality Review

### Issues

| # | Severity | Category | Location | Description | Fix |
|---|----------|----------|----------|-------------|-----|
| Q1 | MINOR | Test coverage | src/integrations/pi/extension.test.ts:32-40 | DS-6 required a template lockstep test asserting both files contain `Design Consultant`; the R1 lockstep test asserts only the six pre-existing title phrases, and the marker is asserted against RUNTIME_SOURCE only (extension-runtime.test.ts:354). The template does contain the marker (extension.tmpl.ts:94) and branch (:178), so behavior is correct today — but the new marker's lockstep invariant is unprotected: a future runtime-only edit would pass tests and silently break designer detection in the shipped extension. | Add `expect(EXTENSION_SOURCE).toContain('Design Consultant')` to the R1 lockstep test in extension.test.ts |
| Q2 | INFO | Convention | src/integrations/pi/index.test.ts:8 | Header doc comment still reads "exactly 18 descriptors are emitted"; the pin was bumped to 24 (line 45). Stale documentation introduced by the T-5 pin bump. | Update the comment to "exactly 24" |

### Convention Compliance

- Kebab-case new files ✓; UPPER_SNAKE_CASE template constants ✓ (DESIGN_SYSTEM_TEMPLATE, DESIGNER_PROMPT); ESM `.js` imports + named exports ✓ (registry.ts:18-22, index.ts:8); commit scopes per coding.md ✓ (git log shows `feat(templates)`, `feat(commands)`, `feat(integrations)`, `feat(artifacts)`, `test(...)` RED/GREEN pairs per task, `docs(plan)` marks); CLI exit codes 0/1/2 ✓ (commands use 0/1 only as designed); templates are data (no I/O) ✓; no co-located tests (tests/ per repo convention) ✓.
- TDD discipline: per-task RED→GREEN→docs(plan) commits verified in git log (e.g. d1b327a RED → d7decb1 GREEN → e07ffd2 mark for T-1, all tasks follow). All 9 tasks `[x]` with commit hashes; pre-archive checklist all `[x]`.
- T-9 nuance: annotation points to the `docs(plan)` mark commit (cbd5d8b) because the dogfood outputs (`.pi/`, `.omp/`, `.claude/`, `.agents/`, `.agent/`, `.codex/`) are gitignored and uncommittable; the original annotation (8f0d7c1) referenced a non-existent commit and was corrected (1876fdd). Dogfood files exist on disk and are byte-verified — acceptable accommodation of the gitignore policy, no issue raised.

## Goal Review

### Goal Checklist

| # | Deliverable | Verify / Acceptance met | Status | Evidence |
| --- | ------------- | -------------------------- | -------- | ---------- |
| G1 | PR-1: Workflow step templates for the design track | all | ACHIEVED | Verify method (registry 16 steps; skill+command render without `{{`; no gstack/Pretext) — tests/templates/workflow-design-steps.test.ts:39-102 green; DS-1 acceptance all met (byte-identical instructions, header order, no `': '`, plan-design-review UI-audit-only) |
| G2 | PR-2: Designer sub-agent role + dispatch + model tier | all | ACHIEVED | Verify (AGENT_PROMPTS contains designer; `bp dispatch designer` prints per-platform; config accepts designer tier) — agents-designer.test.ts green; live `bp dispatch designer` printed 4 platform sections + `bp template design-system`; `models.designer` override live-verified (`gpt-4o-design`); DS-2/DS-3 acceptance met |
| G3 | PR-3: Five design CLI commands | all | ACHIEVED | Verify (`bp --help` lists all five; each exits 0 with non-empty instructions; outside project exits 1) — bp-design-commands.test.ts green + live runs (exit 0 in-project, exit 1 + exact stderr outside); DS-4 acceptance met |
| G4 | PR-4: Platform integration (skills, commands, agent detection, dogfood) | all | ACHIEVED | Verify `bp update` emits `.pi/skills/bp-design*/SKILL.md` (+ omp/codex/agent equivalents when configured) — pi ✓ (16 dirs on disk), codex ✓ (.agents/skills 16), omp ✓ (commands-only platform by design; .omp/commands 16 incl. bp:design*), claude-code ✓ (.claude/commands 16), agent ✓ — round 1 blocker fixed: `.agent/skills/` now 16 dirs incl. the five `bp-design*` after `bp update` (bp-update.ts generatedSet check, commit 33ec7c6; regression test f9d4c0a). vitest 550/550 green ✓; pi extension detection covers designer ✓; DS-5/DS-6 acceptance met |
| G5 | PR-5: Design artifacts + core-loop advisory hooks | all | ACHIEVED | Verify (template renders without `{{`; continue passes with design-review.md; plan/check advisory text) — bp-template.test.ts, design-review-tolerance.test.ts, workflow-advisory-hooks.test.ts green; continue.ts provably unmodified; DS-7/DS-8 acceptance met |

### Goal Verdict: PASS

---

## Review History

| Round | Date | New Issues | Blockers | Verdict |
|-------|------|------------|----------|---------|
| 1 | 2026-08-15 | 3 | 0 | NEEDS_REVISION |
| 2 | 2026-08-16 | 0 | 0 | PASS |

## Issues

- [x] R1 - MAJOR (spec non-compliance): `bp update` deletes the agent-platform design skills. `src/commands/bp-update.ts:58` hardcodes `v2Steps` = the 11 pre-change steps; `:117` uses it as a whitelist to delete `.agent/skills/bp-<step>/` dirs not in it. The 5 new design steps are absent, so `writeGeneratedFiles` writes them and `cleanupStaleFiles` immediately removes them. Reproduced deterministically in a throwaway copy: `bp update` printed `✓ Removed stale: .agent/skills/bp-design/` (×5) and left `.agent/skills` = 11 (pi = 16, .agents = 16, .claude = 16 unaffected — those blocks use `generatedSet`). Real repo state corroborates: `.agent/skills/` has no `bp-design*` dirs while `.agent/agents/bp-designer.md` exists. Violates delta spec Platform-Design-Step-Generation scenario ("skill files exist under ... `.agent/skills/`") and PR-4's "for every configured platform" SHALL; DS-5's "cleanup logic needs no change" claim is incorrect (bp-update.ts has 0 diff in this change). Fix: add `design`, `design-html`, `design-review`, `design-shotgun`, `plan-design-review` to `v2Steps` (or switch the `.agent/skills` block to the `generatedSet`-based check used by `.pi/skills`/`.agents/skills`), and add a regression test that runs `cleanupStaleFiles`/`bp update` with a platform incl. agent and asserts the design dirs survive.
- [x] Q1 - MINOR (test coverage): missing template lockstep assertion for the designer marker — `src/integrations/pi/extension.test.ts:32-40` R1 lockstep test lists only the six pre-existing title phrases; only `RUNTIME_SOURCE` is asserted for `Design Consultant` (extension-runtime.test.ts:354). Add `expect(EXTENSION_SOURCE).toContain('Design Consultant')` to lock the runtime↔template marker invariant (DS-6 test requirement).
- [x] Q2 - INFO (convention): stale header comment in `src/integrations/pi/index.test.ts:8` ("exactly 18 descriptors") after the pin was bumped to 24 at line 45.
- [x] Q2 - INFO (convention): stale header comment in `src/integrations/pi/index.test.ts:8` ("exactly 18 descriptors") after the pin was bumped to 24 at line 45.

## Round 2 Re-Review (2026-08-16)

Full re-review of the entire change after the R1/Q1/Q2 fixes (commits f9d4c0a → 33ec7c6 → 20b0a62). All three gates re-run; no new issues found.

### Fix verification (root-cause, not symptom)

- **R1** — `src/commands/bp-update.ts:109-123`: the `.agent/skills` stale-cleanup block now uses the `generatedSet`-based check (`.agent/skills/${entry}/SKILL.md`), identical to the `.agents/skills`/`.pi/skills` blocks; the drift-prone `v2Steps` hardcoded whitelist is deleted. Regression test added at `tests/commands/bp-update.test.ts:102-123` (asserts the five design dirs survive `bp update` on an agent-only platform and no `Removed stale` log line). Live verification: `node bin/cli.js update` in this repo → `.agent/skills/` = 16 dirs incl. all five `bp-design*`, zero stale-removal lines for design.
- **Q1** — `src/integrations/pi/extension.test.ts:35`: `expect(EXTENSION_SOURCE).toContain('Design Consultant')` added to the R1 lockstep test. Runtime marker at `extension-runtime.ts:108` and template marker at `extension.tmpl.ts:94` both present.
- **Q2** — `src/integrations/pi/index.test.ts:8` header now reads "exactly 24", matching the `toHaveLength(24)` pin at line 47.

### Full-surface re-verification (all PASS)

- Workflow templates: `WORKFLOW_REGISTRY` = 16 keys incl. the five design steps (registry.ts:44-48); `WorkflowStep` keyof auto-widened; skill/command instructions byte-identical, four headers in order, no `{{`, no gstack/Pretext tokens, no `': '` in descriptions (workflow-design-steps.test.ts, 7 tests green).
- DESIGNER_PROMPT (agents/index.ts:700-762): six sections in order, `Design Consultant` marker, `AGENT_CONSTRAINTS` embedded, disjoint from all six other role markers (verified in-script across all 7 prompts).
- Dispatch: live `bp dispatch designer` prints per-platform `## Dispatch: bp-designer (<platform>)` sections, `Read-only role`, `Role: designer`, `bp template design-system`; `models.designer` override live-verified (`pi/plan` default → `gpt-4o-design`).
- CLI: `bp --help` lists all five commands; `bp design`/`design-review`/`plan-design-review` print `## Steps` and exit 0 in-project; outside a project exit 1 with exact stderr.
- Platform STEPS: pi 16, codex 16, agent 16, claude-code 16 commands, omp 16 commands + 15 skills (no refactor — D-9); agent role lists (pi/agent/claude-code/omp) all include `designer`. opencode generator source: 0 diff (only its snapshot updated by the shared plan/check advisory text — correct propagation, not scope drift).
- Extension lockstep: `Design Consultant` marker + explicit `else if (agentType === 'designer')` branch in both extension-runtime.ts and extension.tmpl.ts; paths-only `<bp-context>` block tested.
- Artifacts: `bp template design-system --stdout` renders all 8 subsections with 0 `{{` remaining; `validateChange` accepts `design-review.md`; `bp continue` output byte-identical with/without it (continue.ts: 0 diff).
- Advisory hooks: plan.ts:27 (`bp plan-design-review $1`) and check.ts:34 (`bp design-review $1`), both explicitly advisory; no new MUST/SHALL gate introduced.
- Test suite: `npx vitest run` 74 files / 550 tests green; `npm run build` (tsup bundle) OK. TDD discipline: all 9 tasks RED → GREEN → docs(plan) mark; fix commits follow the same RED (f9d4c0a) → GREEN (33ec7c6) order. Pre-archive checklist all `[x]`.

### Level Assessment (round 2)

- **Proposal Level**: standard — **Reviewer Assessment**: same. No escalation.
