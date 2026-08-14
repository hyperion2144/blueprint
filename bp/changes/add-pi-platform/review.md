# Review: add-pi-platform

## Level Assessment

- **Proposal Level**: standard
- **Reviewer Assessment**: standard
- **Escalation**: none

## Approval

- Approved by: n/a (approvers not configured)
- Date: n/a

## Overall Verdict: NEEDS_REVISION

---

## Spec Review

### Constraint Checklist

| # | Requirement | Type | Status | Evidence |
| --- | ------------- | ------ | -------- | ---------- |
| R1 | pi-platform-support | ADDED | PASS | src/integrations/pi/index.ts:27-44 (provider id/name/supportsCommands); src/integrations/pi/index.test.ts:33-56 (18 files, no .pi/commands/); config.yaml:6-11 |
| R2 | pi-skills-generation | ADDED | PASS | src/integrations/pi/skills.ts:25-92 (11 steps, colon name, no argument-hint, registry body); skills.test.ts:16-91 |
| R3 | pi-agents-generation | ADDED | PASS | src/integrations/pi/agents.ts:22-53 (6 roles, generic frontmatter, model from config); agents.test.ts:17-91 |
| R4 | pi-extension-generation | ADDED | PASS | src/integrations/pi/extension.ts:11-16 (single descriptor, byte-deterministic, EXTENSION_SOURCE re-export); extension.test.ts:49-68; dogfood `.pi/extensions/bp/index.ts` byte-equals EXTENSION_SOURCE (verified) |
| R5 | pi-extension-context-contract | ADDED | FAIL | src/integrations/pi/extension-runtime.ts:96-104 — agent-type detection misfires on the real generated agent prompts; 4 of 6 roles mis-detect (see Issues R1). Template src/templates/pi/extension.tmpl.ts:87-95 shares the bug |
| R6 | pi-extension-subagent-tool | ADDED | PASS | extension-runtime.ts:340-402 (discoverPiAgents/buildSubagentArgs/parseJsonLine tested); template tool registration extension.tmpl.ts:392-463 matches pi example args (--mode json -p --no-session) |
| R7 | pi-extension-bypass-and-config-skip | ADDED | PASS | extension-runtime.ts:271-317 (isDisabled + hasBpConfig guards on all three handlers); extension-runtime.test.ts:180-203, 218-237, 256-271 |
| R8 | pi-update-cleanup | ADDED | PASS | src/commands/bp-update.ts:154-185 (3 .pi/ blocks); tests/commands/bp-update.test.ts:363-435 (stale removed, user files preserved, configured pi never pruned) |

### Scenario Coverage

| Scenario | Test Location | Status |
| ---------- | -------------- | -------- |
| Generate pi platform files (11+6+1, no commands) | index.test.ts:45-56 | PASS |
| Preserve deterministic output | index.test.ts:63-68, skills.test.ts:82-91, extension.test.ts:60-67 | PASS |
| Pi coexists with other platforms | index.test.ts:41-43 (registry isolation); generateAll multi-platform covered by existing generators tests | PASS |
| Generate all eleven pi skills | skills.test.ts:16-23, 35-51 | PASS |
| Skill frontmatter and body | skills.test.ts:25-33, 53-60 | PASS |
| Deterministic skill output | skills.test.ts:82-91 | PASS |
| Generate all six pi agents | agents.test.ts:17-27, 29-40 | PASS |
| Agent frontmatter is generic | agents.test.ts:24-26 (no modelRoles/thinkingLevel), 42-53 | PASS |
| Agent body embeds the role prompt + model from config | agents.test.ts:65-81 | PASS |
| Extension file is emitted + deterministic | extension.test.ts:50-67 | PASS |
| Planner session receives roadmap augmentation | extension-runtime.test.ts:116-128 (synthetic prompt only) | **FAIL in prod** — real PLANNER_PROMPT detected as `executor` (see R1) |
| Executor and fixer sessions receive context rows | extension-runtime.test.ts:130-141 (synthetic prompt only) | **FAIL in prod** — real EXECUTOR_PROMPT detected as `default`; real FIXER_PROMPT detected as `reviewer` (see R1) |
| Reviewer session receives invariants and acceptance text | extension-runtime.test.ts:143-154 (synthetic prompt only) | **FAIL in prod** — real REVIEWER_PROMPT detected as `executor` (see R1) |
| Refactorer session receives refactor targets | extension-runtime.test.ts:156-166 | PASS |
| Unknown agent type receives paths-only block | extension-runtime.test.ts:168-178 | PASS |
| Workflow state is injected once per session | extension-runtime.test.ts:206-216 | PASS |
| Workflow state is re-injected after compaction | extension-runtime.test.ts:240-254 | PASS |
| Single-agent delegation | buildSubagentArgs unit tests extension-runtime.test.ts:342-390; template tool code matches pi example pattern | PASS (argv-level) |
| Parallel delegation (concurrency ≤ 4) | template mapWithConcurrencyLimit extension.tmpl.ts:372-390 (port of pi example) | PASS (code inspection) |
| Unknown agent is rejected | template execute branch extension.tmpl.ts:425-439 | PASS (code inspection) |
| Invalid parameter combinations are rejected | template execute modeCount check extension.tmpl.ts:407-416 | PASS (code inspection) |
| Environment bypass short-circuits handlers | extension-runtime.test.ts:180-193, 218-229, 256-265 | PASS |
| Missing config skips handlers | extension-runtime.test.ts:195-203, 231-237, 267-270 | PASS |
| Remove stale generated pi entries | bp-update.test.ts:386-421 | PASS |
| Preserve user-owned pi files | bp-update.test.ts:398-421 | PASS |
| Configured pi output is never pruned | bp-update.test.ts:424-435 | PASS |

### Spec Verdict: NEEDS_REVISION

---

## Quality Review

### Issues

| # | Severity | Category | Location | Description | Fix |
|---|----------|----------|----------|-------------|-----|
| Q1 | MINOR | Bug | src/templates/pi/extension.tmpl.ts:479-487 vs src/integrations/pi/extension-runtime.ts:282-294 | Lockstep divergence in `before_agent_start`: template sets `bpStateInjected = true` BEFORE the `hasBpConfig` guard; runtime checks config first. With `bp/config.yaml` missing on first invocation, the template burns the once-per-session injection, the runtime does not. DS-5 requires handler semantics equal to the template's. Second divergence: template `loadPiAgents` accepts `isFile() \|\| isSymbolicLink()`, runtime `discoverPiAgents` accepts `isFile()` only. | Reorder the template guard to check `hasBpConfig` before setting the flag; align symlink handling in both files. Add a lockstep test that compares handler behavior (or at least the guard ordering) between runtime and template. |

### Convention Compliance

- ESM `.js` import suffixes: PASS (all pi files).
- kebab-case filenames: PASS.
- UPPER_SNAKE constants (PI_SKILL_DEFS, PI_AGENT_DEFS, EXTENSION_SOURCE, PI_EXTENSION_PATH): PASS.
- Snapshot discipline: PASS (3 snapshot files present, tests run with --update flow).
- Commit scopes (integrations/generators/config/test): PASS (see git log).
- TDD RED→GREEN: PASS (every behavior task has a test-first commit immediately followed by its feat commit; T-1..T-9 all `[x]` with `<!-- commit: -->` hashes; pre-archive checklist complete).

### Quality Verdict: NEEDS_REVISION

---

## Goal Review

### Goal Checklist

| # | Deliverable | Verify / Acceptance met | Status | Evidence |
| --- | ------------- | -------------------------- | -------- | ---------- |
| G1 | PR-1: Pi platform provider + skills | all | ACHIEVED | `node bin/cli.js update` with `platform: [pi]` emits exactly 11 `.pi/skills/bp-<step>/SKILL.md` (dogfood `.pi/skills/` present, 11 dirs); snapshot matches; frontmatter name/description + non-empty registry bodies asserted in skills.test.ts; `bp context plan --format=compact` verified working (template execSync target valid) |
| G2 | PR-2: Sub-agent definitions | all | ACHIEVED | 6 `.pi/agents/bp-<role>.md` emitted (dogfood present); parse via parseFrontmatter with name/description/non-empty body (agents.test.ts:42-53); no OMP fields; model injection from config tested |
| G3 | PR-3: bp extension (context injection + subagent tool) | partial | PARTIAL | Extension emits and is byte-deterministic; bypass/config-skip/once-per-session/compaction-reinject all tested. BUT the PR-3 SHALL "augmented per detected agent type" is not delivered for 4 of 6 roles: with the real generated agent prompts, planner→executor, executor→default, reviewer→executor, fixer→reviewer (verified by executing detectAgentTypeFromPrompt against AGENT_PROMPTS). Root cause = R1. bp_subagent tool argv/discovery matches the pi example pattern (extension-runtime.test.ts:342-390). |
| G4 | PR-4: Registration, config, update cleanup | all | ACHIEVED | registerPiProvider() at src/generators/index.ts:30; barrel export src/integrations/index.ts:14; config.yaml platform list has pi after codex; cleanup blocks + tests pass (bp-update.test.ts); `bp update`/`bp context` load config without schema error |
| G5 | PR-5: Tests | all | ACHIEVED | `npx vitest run` — 68 files / 506 tests pass; pi tests (61) pass; build passes. Gap: detection tests use synthetic prompts (`## Role\nexecutor prompt`) so they never exercise the real AGENT_PROMPTS bodies — this gap let R1 through |

### Goal Verdict: NEEDS_REVISION

---

## Review History

| Round | Date | New Issues | Blockers | Verdict |
|-------|------|------------|----------|---------|
| 1 | 2026-08-14 | 3 | 0 | NEEDS_REVISION |

## Issues

- [ ] R1 - pi-extension-context-contract: agent-type detection misfires on real generated agent prompts — 4 of 6 roles mis-detect (planner→executor, executor→default, reviewer→executor, fixer→reviewer). src/integrations/pi/extension-runtime.ts:96-104 and src/templates/pi/extension.tmpl.ts:87-95 use substring markers that do not exist in the actual AGENT_PROMPTS bodies (PLANNER_PROMPT = "Change Design Specialist", EXECUTOR_PROMPT = "Code Implementation Specialist" — no role-name substring; REVIEWER_PROMPT contains "executor"; FIXER_PROMPT contains "reviewer"). Design D-2's premise ("each prompt contains its role name in the ## Role heading") is false. Spec scenarios "Planner session receives roadmap augmentation", "Executor and fixer sessions receive context rows", "Reviewer session receives invariants and acceptance text" fail in production. Fix: detect on markers that exist (e.g. match the actual first-line role titles, or match `bp-<role>` patterns), fix BOTH runtime and template, and add a test that runs detectAgentTypeFromPrompt against the real AGENT_PROMPTS[role] values. (spec)
- [ ] Q1 - Lockstep divergence between template and runtime: `before_agent_start` sets bpStateInjected before the hasBpConfig guard in the template (extension.tmpl.ts:479-487) but after in the runtime (extension-runtime.ts:282-294); symlink acceptance differs (template loadPiAgents accepts symlinks, runtime discoverPiAgents requires isFile()). Align both. (quality)
- [ ] G1 - PR-3 partial: the per-agent-type context augmentation (core deliverable) is not delivered for planner/executor/reviewer/fixer with the shipped agent prompts. Same root cause as R1. (goal)
<!-- Remove placeholder lines above. Add as many - [ ] lines as there are findings. -->

## Routing

- **D issues**: 0 (none)
- **R/Q/G issues**: 3 (R1, Q1, G1)

**Recommendation**: `bp fix add-pi-platform` then re-review
<!-- Advisory only. Orchestrator MUST ask the user before archiving, regardless of this recommendation. -->
