# Review: add-pi-platform

## Level Assessment

- **Proposal Level**: standard
- **Reviewer Assessment**: standard
- **Escalation**: none

## Approval

- Approved by: n/a (approvers not configured)
- Date: n/a

## Overall Verdict: PASS

---

## Spec Review

### Constraint Checklist

| # | Requirement | Type | Status | Evidence |
| --- | ------------- | ------ | -------- | ---------- |
| R1 | pi-platform-support | ADDED | PASS | src/integrations/pi/index.ts:27-44 (provider id/name/supportsCommands); src/integrations/pi/index.test.ts:33-56 (18 files, no .pi/commands/); config.yaml:6-11 |
| R2 | pi-skills-generation | ADDED | PASS | src/integrations/pi/skills.ts:25-92 (11 steps, colon name, no argument-hint, registry body); skills.test.ts:16-91 |
| R3 | pi-agents-generation | ADDED | PASS | src/integrations/pi/agents.ts:22-53 (6 roles, generic frontmatter, model from config); agents.test.ts:17-91 |
| R4 | pi-extension-generation | ADDED | PASS | src/integrations/pi/extension.ts:11-16 (single descriptor, byte-deterministic, EXTENSION_SOURCE re-export); extension.test.ts:49-68; dogfood `.pi/extensions/bp/index.ts` byte-equals EXTENSION_SOURCE (verified) |
| R5 | pi-extension-context-contract | ADDED | PASS | detection keys on the real AGENT_PROMPTS role-title phrases, not bare role-name substrings — runtime src/integrations/pi/extension-runtime.ts:110-134 (AGENT_TYPE_MARKERS), template src/templates/pi/extension.tmpl.ts:87-105; detection pinned against the REAL prompt bodies (extension-runtime.test.ts:114-129: all 6 roles incl. codebase-scanner classify correctly) and the template's inline markers pinned (extension.test.ts:32-43); handler scenarios re-verified with real title phrases (extension-runtime.test.ts:158-228) |
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
| Planner session receives roadmap augmentation | extension-runtime.test.ts:158-173 (real title phrase); all-role detection pinned to real AGENT_PROMPTS at 114-129 | PASS |
| Executor and fixer sessions receive context rows | extension-runtime.test.ts:175-197 (real title phrases) + 114-129 | PASS |
| Reviewer session receives invariants and acceptance text | extension-runtime.test.ts:199-213 (real title phrase) + 114-129 | PASS |
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

### Spec Verdict: PASS

---

## Quality Review

### Issues

| # | Severity | Category | Location | Description | Fix |
| --- | ---------- | ---------- | ---------- | ------------- | ----- |
| Q1 | MINOR — RESOLVED r2 (130871e) | Bug | extension.tmpl.ts:489-497 vs extension-runtime.ts:343-355 | before_agent_start guard ordering + symlink acceptance lockstep — fixed: template checks hasBpConfig BEFORE setting bpStateInjected (tmpl 492-494, runtime 345-347); symlinked agent files accepted in BOTH (tmpl 241, runtime 427) | verified fixed, no action |
| Q2 | MINOR | Bug (lockstep) | extension-runtime.ts:424-427 vs extension.tmpl.ts:240 | Fixer aligned symlink handling but dropped the `.md` suffix filter from runtime `discoverPiAgents` that template `loadPiAgents` keeps — runtime would accept a non-`.md` file with valid name/description frontmatter, template ignores it. Also `codebase-scanner` falls through differently: runtime returns `block + "\n\n"` (extension-runtime.ts:248,296), template returns the clean block (extension.tmpl.ts:170-208). | Restore `entry.name.endsWith('.md')` in runtime discoverPiAgents; add a codebase-scanner branch (or explicit fall-through) so both emit identical bytes; add a lockstep assertion on loadPiAgents/discoverPiAgents behavior. |
| Q3 | MINOR | Convention (artifact drift) | design.md:412, 160, 192, 278, 267 | Design artifact not updated by the fixer: D-2 Reason still asserts the false premise "each prompt contains its role name in the ## Role heading" (design.md:412 — the exact root cause of R1); DS-4 §3 and DS-5 detectAgentTypeFromPrompt still describe bare substring markers (`planner`/`executor`/...); DS-5 AgentType union (design.md:267) omits `codebase-scanner` which the implementation added. | Update design.md: D-2 reason → title-phrase markers; DS-4/DS-5 marker descriptions → AGENT_TYPE_MARKERS phrases; add codebase-scanner to the DS-5 AgentType union. |
| Q4 | MINOR | Convention (working-tree hygiene) | extension-runtime.ts, extension-runtime.test.ts, extension.test.ts (uncommitted, mtime 21:35:24 = 39s after 130871e) | Format-only uncommitted drift on the 3 fixer-touched files: double quotes + tabs + rewrapped imports, inconsistent with the repo's single-quote/2-space style (siblings skills.ts, agents.ts, index.ts, extension.ts, extension.tmpl.ts, and the omp counterparts). Verified quote/indent/wrap only — zero logic change. Leaves the change's working tree dirty at review time. | Revert the reformat (restore committed state) or commit it consistently; align with the module's single-quote/2-space convention. |

### Convention Compliance

- ESM `.js` import suffixes: PASS (all pi files).
- kebab-case filenames: PASS.
- UPPER_SNAKE constants (PI_SKILL_DEFS, PI_AGENT_DEFS, EXTENSION_SOURCE, PI_EXTENSION_PATH): PASS.
- Snapshot discipline: PASS (3 snapshot files present; extension snapshot updated in 130871e with the new markers).
- Commit scopes (integrations/generators/config/test): PASS (see git log).
- TDD RED→GREEN: PASS (R1 fix shipped as d9f2f5d RED → 130871e GREEN; T-1..T-9 all `[x]` with hashes).
- Working-tree state: FAIL — Q4 (uncommitted format drift on 3 files).
- Note: one vitest run (run concurrently with `npm run build`) showed 1 failure in 2 files; two subsequent serial runs are clean (68 files / 508 tests pass) — treated as a build-race flake, not a code defect.
- Note: dogfood `.pi/extensions/bp/index.ts` was stale (still carried the pre-fix substring detection + guard-order bug) — regenerated during this review via `node bin/cli.js update`; now byte-identical to EXTENSION_SOURCE. Recommend the fix loop re-runs `bp update` after template edits (`.pi/` is gitignored so the fixer commits never refreshed it).

### Quality Verdict: PASS

---

## Goal Review

### Goal Checklist

| # | Deliverable | Verify / Acceptance met | Status | Evidence |
| --- | ------------- | -------------------------- | -------- | ---------- |
| G1 | PR-1: Pi platform provider + skills | all | ACHIEVED | `node bin/cli.js update` with `platform: [pi]` emits exactly 11 `.pi/skills/bp-<step>/SKILL.md` (dogfood `.pi/skills/` present, 11 dirs); snapshot matches; frontmatter name/description + non-empty registry bodies asserted in skills.test.ts; `bp context plan --format=compact` verified working (template execSync target valid) |
| G2 | PR-2: Sub-agent definitions | all | ACHIEVED | 6 `.pi/agents/bp-<role>.md` emitted (dogfood present); parse via parseFrontmatter with name/description/non-empty body (agents.test.ts:42-53); no OMP fields; model injection from config tested |
| G3 | PR-3: bp extension (context injection + subagent tool) | all | ACHIEVED | detection now classifies all 6 roles against the REAL AGENT_PROMPTS bodies (extension-runtime.test.ts:114-129); planner roadmap / executor+fixer GUARD-RAIL rows / reviewer invariants+tasks / refactorer targets verified with real title phrases (extension-runtime.test.ts:158-228); bypass/config-skip/once-per-session/compaction-reinject tests pass; dogfood `.pi/extensions/bp/index.ts` regenerated and verified byte-equal to EXTENSION_SOURCE; bp_subagent argv/discovery matches the pi example pattern (extension-runtime.test.ts:381-505) |
| G4 | PR-4: Registration, config, update cleanup | all | ACHIEVED | registerPiProvider() at src/generators/index.ts:30; barrel export src/integrations/index.ts:14; config.yaml platform list has pi after codex; cleanup blocks + tests pass (bp-update.test.ts); `bp update`/`bp context` load config without schema error |
| G5 | PR-5: Tests | all | ACHIEVED | `npx vitest run` — 68 files / 508 tests pass (serial runs); pi tests (47) pass; build passes. R1 regression gap closed: detection test now exercises the real AGENT_PROMPTS bodies (extension-runtime.test.ts:114-129) + template marker assertions (extension.test.ts:32-43) |

### Goal Verdict: PASS

---

## Review History

| Round | Date | New Issues | Blockers | Verdict |
| ------- | ------ | ------------ | ---------- | --------- |
| 1 | 2026-08-14 | 3 | 0 | NEEDS_REVISION |
| 2 | 2026-08-14 | 3 (Q2, Q3, Q4) | 0 | NEEDS_REVISION |
| 3 | 2026-08-14 | 1 (Q5 INFO, non-blocking) | 0 | PASS |

## Issues

- [x] R1 - pi-extension-context-contract: agent-type detection misfires on real generated agent prompts. RESOLVED by d9f2f5d (RED) + 130871e (GREEN): both runtime (extension-runtime.ts:110-134) and template (extension.tmpl.ts:87-105) now match on the real AGENT_PROMPTS role-title phrases (Change Design Specialist / Code Implementation Specialist / Triple Review Specialist / Codebase Scanner / **refactorer** sub-agent / **bp-fixer** sub-agent); verified disjoint (each marker occurs exactly once, in its own prompt body, src/templates/agents/index.ts); regression test pins detection against the real AGENT_PROMPTS values (extension-runtime.test.ts:114-129) and the template's inline markers (extension.test.ts:32-43). (spec)
- [x] Q1 - Lockstep divergence between template and runtime: `before_agent_start` sets bpStateInjected before the hasBpConfig guard in the template but after in the runtime; symlink acceptance differs. RESOLVED by 130871e — guard order aligned (tmpl 492-494, runtime 345-347), symlink accepted in both (tmpl 241, runtime 427). (quality)
- [x] G1 - PR-3 partial: the per-agent-type context augmentation (core deliverable) is not delivered for planner/executor/reviewer/fixer with the shipped agent prompts. RESOLVED — same root cause as R1; all 6 roles now classify correctly against real prompts (extension-runtime.test.ts:114-129) and the augmentation branches are verified with real title phrases (158-228). (goal)
- [x] Q2 - Lockstep divergence introduced by the R1 fix: runtime `discoverPiAgents` dropped the `.md` suffix filter that template `loadPiAgents` keeps (extension-runtime.ts:424-427 vs extension.tmpl.ts:240); `codebase-scanner` also falls through with trailing `\n\n` in the runtime (248,296) vs clean block in the template (170-208). RESOLVED by 6fed3d7 (RED) + 4e5401f (GREEN): `.md` filter restored (extension-runtime.ts:371), symlink accepted (372), `renderAugmentedBody` returns the clean block with no trailing newline when no branch augments (264); template side verified aligned (extension.tmpl.ts:240/241/172/207). Lockstep pinned: runtime txt-skip test (extension-runtime.test.ts:358-370), codebase-scanner == default byte-identity + no trailing `\n\n` (196-222), EXTENSION_SOURCE re-export identity (318-322), template marker assertions (extension.test.ts:44-51). (quality)
- [x] Q3 - design.md stale after the R1 fix: D-2 Reason still states the false premise "each prompt contains its role name in the ## Role heading" (design.md:412); DS-4 §3 + DS-5 still describe bare substring markers (160,192,278); DS-5 AgentType union omits codebase-scanner (267). RESOLVED by 70c5bf5: D-2 Reason now describes the role-title phrase markers (design.md:411-412); DS-4 §3 (160) and DS-5 `detectAgentTypeFromPrompt` (278) list the title phrases; DS-5 AgentType union includes `codebase-scanner` (267, 536). (quality)
- [x] Q4 - Uncommitted format-only drift on the 3 fixer-touched files (double quotes + tabs, mtime 21:35:24, 39s after 130871e), inconsistent with the repo's single-quote/2-space style and leaving the working tree dirty. RESOLVED — fixer kept new edits in repo style (committed in 6fed3d7/4e5401f/70c5bf5); round-3 verification: `git status` clean (only untracked `.pi-glla/`, not part of this change), `git diff` empty, `git ls-files -m` empty, working tree matches HEAD at 70c5bf5. (quality)
- [x] Q5 - INFO (non-blocking, doc drift): design.md DS-5 Key Interfaces lists `formatStateSummary` among the exported helpers (design.md:260), but the implementation keeps it private (extension-runtime.ts:137) — identical to the OMP mirror runtime (omp/extension-runtime.ts:123, also private). No external consumer, behavior tested via handler assertions (extension-runtime.test.ts:257, 293); no action required beyond optionally aligning the design.md wording with "helpers (incl. formatStateSummary, internal)". (quality)
<!-- Remove placeholder lines above. Add as many - [ ] lines as there are findings. -->

## Routing

- **D issues**: 0 (none)
- **R/Q/G issues**: 0 open — R1/Q1/Q2/Q3/Q4 resolved and marked [x]; Q5 recorded as INFO non-blocking [x]

**Recommendation**: archive-ready — `bp archive add-pi-platform`

<!-- Advisory only. Orchestrator MUST ask the user before archiving, regardless of this recommendation. -->
