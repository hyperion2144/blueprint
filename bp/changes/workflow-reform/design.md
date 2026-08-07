# Design: workflow-reform

<!--
  Structured technical design. Produced by the planner agent.
  This is the blueprint executors follow - its quality determines implementation quality.
-->

## Design Items

### DS-1: Check workflow template module

- **Refs**: PR-1, PR-2, PR-6
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Provide the renamed change-verification step instructions (`check`) that own the full verify → fix → full-re-review loop while keeping the `review.md` artifact file name.
- **Requirements**:
  - The module SHALL be named `check.ts` (renamed from `review.ts`).
  - The exported getters SHALL be `getCheckSkillTemplate()` / `getCheckCommandTemplate()` returning `SkillTemplate` / `CommandTemplate` whose `name` is `bp-check`.
  - The instructions SHALL instruct the orchestrator to dispatch the reviewer for a full triple review, and on a non-PASS verdict to dispatch the fixer (`bp dispatch fixer --change $1`) then re-dispatch the reviewer for a **full** re-review of the entire change (all three gates) — never a fix-mode diff-only check.
  - The instructions SHALL NOT mention `--fix` mode, `bp apply --fix`, or `bp plan --fix`.
  - The instructions SHALL keep the artifact named `review.md` (all references to the artifact unchanged).
- **Constraints**:
  - Keep the `## Input`, `## Steps`, `## Output`, `## Guardrails` section structure (asserted by `tests/templates` and `bp/specs/templates/spec.md`).
  - Keep the shared `CONTEXT_JSONL_REMINDER` block before `## Input` (asserted by `workflow-apply-review.test.ts` / `refactor.test.ts`).
  - Keep the "auto-injected by the OMP Extension" phrase (asserted by `workflow-apply-review.test.ts`).
  - The review gate guardrails (round cap `config.budget.max_review_rounds`, critical approval gate, CI mode) SHALL be preserved.
- **Acceptance Criteria**: `WORKFLOW_REGISTRY['check'].command().content` equals `getCheckCommandTemplate().content`; the content references `bp dispatch fixer` and a full re-review; the content does not contain `--fix` or `bp apply --fix`; the content contains `review.md`.
- **Key Interfaces**: `getCheckSkillTemplate()`, `getCheckCommandTemplate()`
- **Detailed Design**:
  - Rename `src/templates/workflows/review.ts` → `src/templates/workflows/check.ts`. Update the two exported getters to `getCheckSkillTemplate()`/`getCheckCommandTemplate()`, set `name: 'bp-check'`, description "Triple review — full verify + fixer loopback + full re-review", and tags `['bp', 'check', 'quality', 'specs', 'sub-agent', 'fixer', 'loopback']`.
  - Rewrite the `instructions` body:
    - **Input**: `$ARGUMENTS` (optional change name); `--ci` (CI mode). Remove the `--fix` option and the `--fix` prerequisites.
    - **Prerequisites**: code implemented (tasks.md `[x]` with commit hashes), build + tests pass per `bp/config.yaml`.
    - **Step 1**: Resolve change name and paths (same as plan Step 1).
    - **Step 2**: Pre-check verification — run the project's build and test suite; do NOT dispatch reviewer if they fail.
    - **Step 3**: Classify change (lightweight vs full) — lightweight = all non-behavior tasks, orchestrator quick check; full = dispatch reviewer sub-agent.
    - **Step 4**: Dispatch reviewer for a full triple review (spec + quality + goal gates). Do NOT write review.md yourself.
    - **Step 5**: Read `bp/changes/$1/review.md` and route:
      - **PASS (zero issues)** → present verdict, ask the user, then `bp archive $1` if confirmed.
      - **FAIL / NEEDS_REVISION** (any open `[ ]` R/Q/G/D issue) → dispatch the fixer: `bp dispatch fixer --change $1` (the fixer repairs proposal/design/implementation per the review issues), then re-dispatch the reviewer for a **full re-review** of the entire change. Do NOT re-check only the fixed issues.
      - **[FUSE] diminishing returns** → do not auto-route to another fix; present remaining issues for human verification; if the user confirms all resolved, write `## Human Verdict: PASS` in review.md and run `bp archive $1`.
    - **Step 6**: Commit review.md with `bp commit -m "docs(review): triple review for $1" --files bp/changes/$1/review.md`.
    - **Guardrails**: fix loop limit `config.budget.max_review_rounds` (default 3); level-aware review (trivial=quick, light=optional, standard=triple, critical=triple+security+human approval); critical approval gate (`config.approvers`); CI mode (`--ci` exits 1 on non-PASS); every reviewer run is a full triple review.
  - PR-6 note: write the body already simplified (one sentence per point, no `--fix` sections, no boilerplate repeats) since this module is rewritten from scratch; the Wave-5 simplification pass (DS-18) trims any remaining prose in all templates uniformly.

### DS-2: Workflow registry + schema step rename

- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Rename the `review` registry key to `check` and the schema action step to `check` so every consumer resolves the renamed step.
- **Requirements**:
  - `WORKFLOW_REGISTRY['check']` SHALL resolve to the check template getters; `WORKFLOW_REGISTRY['review']` SHALL no longer exist.
  - The built-in schema step id `review`/command `review` SHALL become `check`; the archive step's `requires` SHALL reference `check`.
- **Constraints**: The schema `completion` enum values `review_exists` / `review_pass` refer to the `review.md` artifact and SHALL stay unchanged (artifact name is preserved).
- **Acceptance Criteria**: `WORKFLOW_REGISTRY` has a `check` key and no `review` key; `loadSchema()` default steps route `check` before `archive`; typecheck passes.
- **Key Interfaces**: `WORKFLOW_REGISTRY`, `WorkflowStep`, `DEFAULT_SCHEMA`
- **Detailed Design**:
  - `src/templates/workflows/registry.ts`: change the import from `./review.js` to `./check.js`, rename `getReviewSkillTemplate`/`getReviewCommandTemplate` to `getCheckSkillTemplate`/`getCheckCommandTemplate`, and rename the key `review:` → `check:` in the registry object. Update the header comment (8-step workflow list now names `check`).
  - `src/core/schema.ts` `DEFAULT_SCHEMA`: change the step `{ id: 'review', requires: ['apply'], command: 'review', completion: 'review_exists', dispatch: 'reviewer' }` → `{ id: 'check', requires: ['apply'], command: 'check', completion: 'review_exists', dispatch: 'reviewer' }`, and change the archive step's `requires` from `['review']` to `['check']`. The `completion` enum (`review_exists`, `review_pass`) and `dispatch: 'reviewer'` stay (artifact and reviewer role names unchanged).

### DS-3: Continue routing rename + fix-routing relocation

- **Refs**: PR-1, PR-2
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Update `src/core/continue.ts` so `bp continue` reports `check` as the next step and routes any non-PASS review to `bp check` (which owns the fixer loopback) instead of `plan --fix` / `apply --fix`.
- **Requirements**:
  - `getWorkflowInstructions('check', ...)` SHALL resolve to the check template; `bp continue` SHALL emit `check` as the next step name.
  - On a non-PASS review verdict, `bp continue` SHALL route to `bp check <name>` (not `plan --fix` / `apply --fix`); the D-vs-R/Q/G routing distinction SHALL be removed because the fixer repairs proposal/design/implementation together.
  - The `[FUSE]` diminishing-returns branch SHALL route to `bp check <name>` (human-verified re-check).
- **Constraints**: The `checkArtifacts` `review` field and `readReviewStatus` keep reading `review.md` (artifact unchanged).
- **Acceptance Criteria**: `determineNextStepForChange` returns `command` containing `check` for an implemented-but-unreviewed change and for a change with a FAIL/NEEDS_REVISION verdict; no `--fix` commands are emitted.
- **Key Interfaces**: `getWorkflowInstructions`, `determineChangeNextStep`, `checkStepCompletion`, `readReviewStatus`
- **Detailed Design**:
  - `determineChangeNextStep`:
    - FUSE branch (`[FUSE] Diminishing returns`): change `command: \`bp review ${changeName}\`` → `command: \`bp check ${changeName}\`` and `getWorkflowInstructions('review', bpDir)` → `getWorkflowInstructions('check', bpDir)`; keep the "recommend human verification" description.
    - Fix-routing branch (review exists && verdict !== PASS): replace the `hasDesignIssues → plan --fix` / `else → apply --fix` branches with a single return: `command: \`bp check ${changeName}\``, description `Fix issues and re-review — ${reviewVerdict}, ${unresolvedIssues} unresolved`, `instructions: getWorkflowInstructions('check', bpDir)`. Delete the `plan --fix`/`apply --fix` command strings.
    - Phase-2 review description: `else if (step.id === 'check')` description "Verify build and tests pass, then dispatch reviewer for a full triple review".
    - Schema step-id guard `if (step.id === 'review')` → `if (step.id === 'check')`; requires guard `if (req === 'review')` → `if (req === 'check')`.
  - `src/commands/bp-state.ts`: `nextAction` for status `applied` → `` `bp check ${activeChange.name}` `` (was `bp review`).

### DS-4: Check CLI command rename

- **Refs**: PR-1, PR-2
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Rename the `bp review` CLI command to `bp check`, drop the `--fix` option, and gate on the `check` context phase.
- **Requirements**:
  - `bp check [name]` SHALL print the check-step workflow instructions; `bp review` SHALL no longer be a registered command.
  - The `--fix` option SHALL be removed from the check command; gate validation SHALL use the `check` phase.
- **Constraints**: `--ci` option stays; the change-existence / artifact gates stay (tasks all `[x]`, pre-archive checklist complete).
- **Acceptance Criteria**: `bp check <name>` prints `WORKFLOW_REGISTRY['check'].command().content`; `bp review` is an unknown command; `--fix` is absent from `--help`.
- **Key Interfaces**: `register(program)` (command `check [name]`)
- **Detailed Design**:
  - Rename `src/commands/bp-review.ts` → `src/commands/bp-check.ts`. In `register`, change `.command('review [name]')` → `.command('check [name]')`, description "Triple check of a change — full verify + fixer loopback + full re-review", remove `.option('--fix', ...)`. In `checkHandler`, remove the `options.fix` signature field and the `Mode: --fix` console branch; keep the `--ci` option (rename the param object to `{ ci?: boolean }`).
  - Change `gateContextJsonl(bpDir, changeName, 'review')` → `gateContextJsonl(bpDir, changeName, 'check')`.
  - `src/cli.ts`: `import { register as registerReview } from './commands/bp-review.js'` → `registerCheck` from `./commands/bp-check.js`; `registerReview(program)` → `registerCheck(program)`.
  - `src/commands/_utils.ts`: widen `gateContextJsonl` phase union `'plan' | 'apply' | 'review' | 'archive'` → `'plan' | 'apply' | 'check' | 'archive'`.
  - `src/core/artifact-validator.ts`: `currentPhase` union and `validateContextJsonlFile` param `'plan' | 'apply' | 'review' | 'archive'` → `'plan' | 'apply' | 'check' | 'archive'`. (The `case 'review':` in `validateArtifact` refers to the review.md artifact — keep.)
  - `src/core/context-jsonl-io.ts` and `src/types/context-jsonl-io.ts`: `CONTEXT_PHASES = ['plan', 'apply', 'review', 'archive', 'all']` → `['plan', 'apply', 'check', 'archive', 'all']`; `currentPhase` union updated the same way.

### DS-5: Platform step generators rename

- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Update every platform step array / description map so the generated command and skill files are `bp-check` (no `bp-review` files).
- **Requirements**:
  - Each platform generator SHALL emit `.omp/commands/bp-check.md`, `.claude/commands/bp-check.md`, `.opencode/commands/bp-check.md`, `.agent/skills/bp-check/SKILL.md`, `.agents/skills/bp-check/SKILL.md` (codex) and NO longer emit `bp-review` equivalents.
  - Step descriptions SHALL read `check` (e.g. "Triple check of a change - full verify + fixer loopback + full re-review").
- **Constraints**: Step order/position in each array stays (init, roadmap, propose, plan, apply, check, archive, continue, ff, loop[, refactor]).
- **Acceptance Criteria**: all step arrays contain `'check'` and not `'review'`; snapshots regenerated; `bp update` produces `bp-check` files on every configured platform.
- **Key Interfaces**: `STEP_DEFS` (omp/commands, claude-code/commands, opencode/commands), `STEPS` (omp/skills, agent/skills, codex/skills), `skillDescription`/`codexSkillDescription` maps
- **Detailed Design**: For each of the six generator files, replace the `review` entry with `check`:
  - `src/integrations/omp/commands.ts` STEP_DEFS: `{ step: 'check', name: 'bp:check', description: 'Triple check of a change - full verify + fixer loopback + full re-review', usesAgent: true, agents: ['reviewer', 'fixer'], argumentHint: '[change-name]' }`.
  - `src/integrations/claude-code/commands.ts` STEPS: `{ step: 'check', name: 'bp:check', description: 'Triple check of a change - full verify + fixer loopback + full re-review', argumentHint: '[change-name]' }`.
  - `src/integrations/opencode/commands.ts` STEPS: `{ step: 'check', description: 'Triple check of a change - full verify + fixer loopback + full re-review', argumentHint: '[change-name]' }`.
  - `src/integrations/omp/skills.ts` STEPS array + `skillDescription` map: `check: 'Triple check of a change - full verify + fixer loopback + full re-review'`.
  - `src/integrations/agent/skills.ts` STEPS array + `skillDescription` map: `check: 'Triple check'`.
  - `src/integrations/codex/skills.ts` STEPS array + `codexSkillDescription` map: `check: 'Triple check of a change - full verify + fixer loopback + full re-review'`.
  - Regenerate all snapshot files under `src/integrations/*/__snapshots__/` and `src/generators/__snapshots__/` via `npx vitest run --update`.

### DS-6: State + template command mapping

- **Refs**: PR-1
- **Source**: PR-1 (proposal.md)
- **Responsibility**: Update `bp-template` step mapping and any `review` step-name references so `bp template check` and `bp continue` surface the renamed step.
- **Requirements**:
  - `STEP_TO_WORKFLOW` SHALL map `check` → `'check'` (was `review` → `'review'`), while the artifact-template `FILENAMES['review'] = 'review.md'` SHALL stay.
- **Constraints**: The `review` artifact template (`bp template review` → review.md) is unchanged.
- **Acceptance Criteria**: `bp template check --stdout` prints the check instructions; `bp template review --stdout` still prints the review.md artifact template.
- **Key Interfaces**: `STEP_TO_WORKFLOW`, `FILENAMES`
- **Detailed Design**: `src/commands/bp-template.ts`: change the `STEP_TO_WORKFLOW` entry `review: 'review'` → `check: 'check'`. Keep `FILENAMES.review = 'review.md'` and the `ARTIFACT_TEMPLATES['review']` lookup (REVIEW_TEMPLATE) so the review.md artifact template is still reachable.

### DS-7: Fixer agent prompt

- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Add the `fixer` role prompt to `AGENT_PROMPTS` and generate the platform agent file `bp-fixer.md` (no `bp fix` CLI command).
- **Requirements**:
  - `AGENT_PROMPTS['fixer']` SHALL be a non-empty English string with sections `## Role`, `## Inputs`, `## Behaviors`, `## Guardrails`.
  - The fixer prompt SHALL instruct repairing the change's proposal, design, and implementation from the reviewer report, committing atomically, keeping tests green, and NOT marking review.md issues resolved (the reviewer verifies in the full re-review).
  - No `bp fix` CLI command and no registry entry for a `fix` step SHALL be introduced.
- **Constraints**: Mirrors the refactorer's sub-agent-only precedent (`bp dispatch refactorer`); fixer edits source + change artifacts so it needs executor-style isolation in dispatch (DS-10).
- **Acceptance Criteria**: `AGENT_PROMPTS['fixer'].length > 200` and contains `## Role`, `## Inputs`, `## Behaviors`, `## Guardrails`, `review.md`, `proposal.md`, `design.md`; no `bp fix` command is registered anywhere.
- **Key Interfaces**: `FIXER_PROMPT`, `AGENT_PROMPTS`
- **Detailed Design**:
  - `src/templates/agents/index.ts`: add `export const FIXER_PROMPT = \`...\`` after `REFACTORER_PROMPT` and register `fixer: FIXER_PROMPT` in `AGENT_PROMPTS`.
  - Prompt body (one sentence per point):
    - **Role**: "You are the **bp-fixer** sub-agent. You repair a change's proposal, design, and implementation from the reviewer report. You are NOT a reviewer and NOT a designer — the reviewer's report is your only source of truth."
    - **Inputs**: `bp/changes/<name>/review.md` (open `- [ ] R/Q/G/D` issues), `proposal.md`, `design.md`, `tasks.md`, `specs/<domain>/spec.md`, `bp/specs/<domain>/spec.md`, `bp/conventions/coding.md`, existing source code.
    - **Behaviors**:
      - Step 1: Read review.md and list every open `- [ ]` R/Q/G/D issue.
      - Step 2: Repair each issue in the artifact it belongs to — proposal.md (scope/rationale), design.md (DS-N/delta specs), and implementation (source + tests). Cross-check delta specs against the repaired reality and ADD/MODIFY requirements as needed.
      - Step 3: Run the project's build and test suite (per bp/config.yaml); keep it green.
      - Step 4: Commit atomically with `bp commit -m "fix(<scope>): <description>"` (one commit per coherent fix).
      - Step 5: Report a diff summary of every artifact you touched.
    - **Guardrails**:
      - Fix ONLY reviewer-identified issues plus spec sync — no unrelated edits.
      - Do NOT mark issues `- [ ]` → `[x]` in review.md — the reviewer's full re-review marks them resolved.
      - Do NOT re-review the change yourself; after you finish, the orchestrator re-dispatches the reviewer for a full triple review.
      - Keep tests green at every step; revert a fix that breaks the suite.
  - `.claude/agents/bp-fixer.md`: generated from `AGENT_DEFS` + `AGENT_PROMPTS['fixer']` via `bp update` (do not hand-edit); frontmatter `name: bp-fixer`, `description: Fix proposal/design/implementation per reviewer report`, `tools: [edit, write, bash]`.

### DS-8: Reviewer prompt full-review reform

- **Refs**: PR-2, PR-6
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Remove the reviewer's fix-mode / `--fix` re-review behavior so every reviewer run is a full triple review.
- **Requirements**:
  - `REVIEWER_PROMPT` SHALL NOT contain a `## Fix Mode (Re-review)` section or any `--fix` mode instructions.
  - `REVIEWER_PROMPT` SHALL state that every run performs the full triple review (spec + quality + goal) of the entire change.
- **Constraints**: The `## Role`, `## Core Principles`, `## Input`, `## Output`, `## Context Re-validation`, `## Execution Flow`, `## Common Pitfalls` structure is preserved (asserted by `tests/templates/agents-reviewer.test.ts` and `bp/specs/templates/spec.md`). Keep the `check every row's \`reason\` is still satisfied` phrase (asserted).
- **Acceptance Criteria**: `REVIEWER_PROMPT` has no `## Fix Mode` header, no `--fix` substring, no `[~]` three-state marking instructions, and still contains the `Context Re-validation` contract.
- **Key Interfaces**: `REVIEWER_PROMPT`
- **Detailed Design**:
  - `src/templates/agents/index.ts` `REVIEWER_PROMPT`: delete the `In \`--fix\` mode:` bullets under `## Input`; delete the entire `## Fix Mode (Re-review)` section (three-state `[ ]→[~]→[x]` protocol). Replace `### Step 0: Determine review mode` with a single statement: "Every review run is a full triple review of the entire change — there is no fix-mode or diff-only re-check." In `### Step 6`, remove the "In fix mode, change `- [ ]` to `[x]` for resolved issues" clause and the `[~]` references.
  - `.claude/agents/bp-reviewer.md`: regenerate via `bp update` from `REVIEWER_PROMPT` (same removal).

### DS-9: Platform agents generators + OMP fixer discrimination

- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Emit the `bp-fixer` agent file on every agent platform and teach the OMP Extension runtime to recognize the `fixer` sub-agent type.
- **Requirements**:
  - Each agent-platform generator (`omp`, `claude-code`, `agent`, `opencode`) SHALL include a `fixer` AGENT_DEF producing `bp-fixer.md`.
  - `detectAgentType(ctx)` SHALL return `'fixer'` when `ctx.agentTemplate` contains `fixer`, in both `extension-runtime.ts` and the mirrored `extension.tmpl.ts`.
  - The OMP `session_start`/`before_agent_start` handlers SHALL render an augmented `<bp-context>` block for the `fixer` type that inlines the change's `context.jsonl` rows (path + reason) so the fixer knows which files matter.
- **Constraints**: The `extension.tmpl.ts` inline ES5 MUST mirror `extension-runtime.ts` logic (lockstep warning in file header). The `AgentType` union includes `'fixer'`. Codex has no agent generator (skills only) — no codex agent file.
- **Acceptance Criteria**: `detectAgentType({ agentTemplate: 'bp-fixer' }) === 'fixer'`; every agent generator's output includes `bp-fixer.md`; the extension template's fixer branch matches the runtime's.
- **Key Interfaces**: `AGENT_DEFS` (4 platforms), `detectAgentType`, `AgentType`, `renderAugmentedBody`, `EXTENSION_SOURCE`
- **Detailed Design**:
  - `src/integrations/omp/agents.ts`, `src/integrations/claude-code/agents.ts`, `src/integrations/agent/agents.ts`, `src/integrations/opencode/agents.ts`: add `{ role: 'fixer', description: 'Fix proposal/design/implementation per reviewer report', tools: ['edit', 'write', 'bash'] }` (tools adjusted per platform convention; effort: 'high' for claude-code; mode: 'subagent' for opencode).
  - `src/integrations/omp/extension-runtime.ts`:
    - `AgentType` union → `'planner' | 'executor' | 'reviewer' | 'refactorer' | 'fixer' | 'default'`.
    - `detectAgentType`: add `if (tpl.includes('fixer')) return 'fixer';` (place after refactorer branch).
    - `renderAugmentedBody`: add an `else if (agentType === 'fixer')` branch that inlines context.jsonl rows exactly like the executor branch (same `readContextRows` + `GUARD-RAIL` prefix logic).
  - `src/templates/omp/extension.tmpl.ts`: mirror both changes in the inline ES5 (`AgentType` equivalent, `detectAgentType` fixer branch, and the `else if (agentType === "fixer")` render branch copying the executor row-inlining).
  - Regenerate snapshots (`src/integrations/*/__snapshots__/*.snap`, `src/generators/__snapshots__/*.snap`).

### DS-10: Fixer dispatch support

- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Extend `bp dispatch` so `bp dispatch fixer --change <name>` emits executor-style isolated dispatch instructions (fixer edits code and artifacts).
- **Requirements**:
  - `bp dispatch fixer` SHALL emit a per-platform dispatch block using the executor-style isolation for the configured platform.
  - `ROLE_TEMPLATES['fixer']` SHALL be `[]` (the fixer produces code/artifact edits, no artifact templates).
- **Constraints**: Only `refactorer` requires `--target`; fixer does not. `isExecutorLike` gains `fixer`.
- **Acceptance Criteria**: `bp dispatch fixer --change X` prints a `bp-fixer` dispatch block with an `### Isolation` section matching the executor's isolation type per platform; exits 0.
- **Key Interfaces**: `isExecutorLike`, `ROLE_TEMPLATES`
- **Detailed Design**:
  - `src/commands/bp-dispatch.ts`: `ROLE_TEMPLATES.fixer = []`; `isExecutorLike(role)` → `role === 'executor' || role === 'refactorer' || role === 'fixer'`. No `--target` requirement added (the existing guard is `role === 'refactorer' && !options.target` only).
  - No changes to `FORMATS` or `EXECUTOR_ISOLATION` (fixer reuses executor isolation).

### DS-11: Fix-loopback removal from apply/plan

- **Refs**: PR-2
- **Source**: PR-2 (proposal.md)
- **Responsibility**: Remove the `--fix` modes from `bp apply` / `bp plan` commands and templates, and from the executor/planner prompts and the review.md artifact template routing, since the fixer subsumes them.
- **Requirements**:
  - `bp apply [name]` and `bp plan [name]` SHALL NOT accept `--fix`; their templates SHALL NOT contain `--fix` input, prerequisites, or guardrail references.
  - `EXECUTOR_PROMPT` and `PLANNER_PROMPT` SHALL NOT contain `--fix` mode sections.
  - The `REVIEW_TEMPLATE` (review.md artifact) issue-routing comment SHALL route via the check-step fixer instead of `bp apply --fix` / `bp plan --fix`.
- **Constraints**: The apply/plan templates keep `## Input`, `## Steps`, `## Output`, `## Guardrails`, the `CONTEXT_JSONL_REMINDER`, and the "auto-injected by the OMP Extension" phrase (asserted).
- **Acceptance Criteria**: No `--fix` substring remains in `bp-apply.ts`, `bp-plan.ts`, `apply.ts`, `plan.ts`, `EXECUTOR_PROMPT`, `PLANNER_PROMPT`, or `REVIEW_TEMPLATE`; `bp apply --help` and `bp plan --help` show no `--fix`.
- **Key Interfaces**: `register` in `bp-apply.ts` / `bp-plan.ts`, `apply.ts` / `plan.ts` templates, `EXECUTOR_PROMPT`, `PLANNER_PROMPT`, `REVIEW_TEMPLATE`
- **Detailed Design**:
  - `src/commands/bp-apply.ts`: remove `.option('--fix', ...)`; handler options → `{ }` (no fix param); remove `Mode: ${options.fix ? 'fix' : 'normal'}` branch; remove the `--fix` usage lines.
  - `src/commands/bp-plan.ts`: remove `.option('--fix', ...)`; keep `--write-context`.
  - `src/templates/workflows/apply.ts`: remove the `--fix` bullet from `## Input`, the `In --fix mode:` prerequisite, the Step 3 `In --fix mode: which R/Q/G issue numbers` bullet, the Step 5 `In --fix mode: executors read review.md...` guardrail bullet, and the `review.md (in --fix mode...)` file note. Update `Next: bp review $1` → `Next: bp check $1` (both occurrences) and `Do NOT run bp review` → `Do NOT run bp check`.
  - `src/templates/workflows/plan.ts`: remove `--fix` from `## Input`, the `In --fix mode:` dispatch instruction, the guardrail `In --fix mode: planner only redesigns...`, and the `--fix` note in Step 3. (The DS-N contract-fields dimension is added in DS-16.)
  - `src/templates/agents/index.ts`: `EXECUTOR_PROMPT` — delete the `In \`--fix\` mode:` block under Input and the `fix (--fix mode)` commit-format row (or keep the row only if harmless — delete it to avoid dead references). `PLANNER_PROMPT` — delete the `In \`--fix\` mode, you also receive:` block.
  - `src/templates/artifacts/index.ts` `REVIEW_TEMPLATE`: change the issue-prefix comment `- R-N: Spec non-compliance -> reapply (bp apply --fix)` etc. to `- R/Q/G/D-N: issue -> check step dispatches bp-fixer then a full re-review` (single line). Keep the verdict rules block.

### DS-12: Finish command (finalize → finish)

- **Refs**: PR-3
- **Source**: PR-3 (proposal.md)
- **Responsibility**: Rename the archive executor command `bp finalize` to `bp finish`.
- **Requirements**:
  - `bp finish [name]` SHALL execute the archive (verify review PASS, merge delta specs, move change dir, update roadmap); `bp finalize` SHALL no longer be registered.
  - Error messages SHALL reference `bp check` (was `bp review`) and `bp finish`.
- **Constraints**: `--dry-run` and `--ci` options stay. The review PASS / unresolved-issues gates stay.
- **Acceptance Criteria**: `bp finish <name>` archives a fixture change end-to-end; `bp finalize` is an unknown command; messages mention `bp check`.
- **Key Interfaces**: `register(program)` (command `finish [name]`)
- **Detailed Design**:
  - Rename `src/commands/bp-finalize.ts` → `src/commands/bp-finish.ts`. In `register`, `.command('finish [name]')`, description "Execute archive: merge delta specs, move change to archive, update roadmap". `finalizeHandler` → `finishHandler`. Replace error strings: `Run "bp review" first.` → `Run "bp check" first.`; `Fix issues first: bp apply --fix ${changeName}` → `Fix issues first: bp check ${changeName}` (two occurrences).
  - `src/cli.ts`: `registerFinalize` → `registerFinish` importing from `./commands/bp-finish.js`.

### DS-13: Archive workflow template — orchestrated archive-check step + finish

- **Refs**: PR-3
- **Source**: PR-3 (proposal.md)
- **Responsibility**: Add an orchestrated archive-check step to the archive workflow template and rename `bp finalize` to `bp finish`; the archive-check reconciles the change's delta specs against reality before finishing.
- **Requirements**:
  - The archive template SHALL contain an archive-check Step that scans `proposal.md`, `design.md`, and the implementation, then ADDs/MODIFies requirements in the change's delta specs (`specs/<domain>/spec.md`) to match reality, before running `bp finish`.
  - The template SHALL invoke `bp finish $1` (not `bp finalize`).
- **Constraints**: No new sub-agent for the archive check (orchestrator-executed Step). The pre-archive review-PASS check stays. Keep `## Steps` and `## Guardrails` structure.
- **Acceptance Criteria**: The archive `instructions` contain a `### Step` describing the archive-check (scan + ADD/MODIFY delta specs) ordered before the `bp finish $1` step; no `bp finalize` substring.
- **Key Interfaces**: `getArchiveSkillTemplate`, `getArchiveCommandTemplate`
- **Detailed Design**:
  - `src/templates/workflows/archive.ts`:
    - Intro line: `... Actual archive is done by \`bp finish\`.` (was `bp finalize`).
    - Step 2 (pre-archive check) stays (review.md PASS + no open issues + git status warning).
    - New **Step 3: Archive check — reconcile delta specs with reality** (orchestrator-executed): read `proposal.md` (PR-N behaviors), `design.md` (DS-N), the implementation (source + tests), and each `specs/<domain>/spec.md` delta; for every implemented behavior that the delta spec does not yet require, ADD a requirement (with a scenario); for every delta requirement whose described behavior drifted from the implementation, MODIFY it (full new text + `was:` annotation). Write only to the change's `specs/` delta files — never to `bp/specs/`.
    - New **Step 4: Run finish command**: `bp finish $1` (was `bp finalize $1`); update the "The command will:" list and the conflict-resolution guardrail `re-run \`bp finish $1\``.
    - Renumber subsequent steps (verify archive success, commit, suggest next step). Update the "Archive preserves full context" guardrail unchanged; update any `bp finalize` mention in guardrails to `bp finish`.

### DS-14: Archive spec repair

- **Refs**: PR-3
- **Source**: PR-3 (proposal.md)
- **Responsibility**: Repair the stale `bp/specs/archive/spec.md` so it names the current command surface (`bp finish`, `bp check`) instead of `blueprint archive <path>`.
- **Requirements**:
  - The global archive spec SHALL describe `bp finish <name>` (not `blueprint archive <change-path>`) and reference `bp check` (not `bp review`) for the verification gate.
- **Constraints**: This is a docs-style global-spec repair; behavioral content is preserved, only the command surface is modernized.
- **Acceptance Criteria**: No `blueprint archive` substring remains; `bp finish` and `bp check` appear in the relevant requirements.
- **Key Interfaces**: none (global spec file)
- **Detailed Design**:
  - `bp/specs/archive/spec.md`: update every requirement/scenario that names `blueprint archive <path>` or `bp review`:
    - "Archive Command Input": `blueprint archive <change-path>` → `bp finish <change-name>`; scenario path `blueprint/changes/login-flow/` → `bp/changes/login-flow/`.
    - "Missing Change Error": command invocation updated to `bp finish`.
    - "Delta-Spec Merging during Archive": update source refs from `src/commands/blueprint-archive.ts` to `src/commands/bp-finish.ts` where applicable; keep merge semantics.
    - "Archive Directory Move": `archive/changes/...` → `bp/changes/archive/<date>-<name>/` per current `archiveChangeDir`.
    - "State Update on Archive": keep the artifact-derivation wording; remove the "归档完成。" requirement text if present (or translate to English `Archived <name>` per current bp-finish output) — align with the actual `bp finish` output lines.
  - Do NOT touch other stale v1-era domains (context/state v1 text is repaired in their own deltas where the proposal requires it).

### DS-15: Propose template grilling-first

- **Refs**: PR-4
- **Source**: PR-4 (proposal.md)
- **Responsibility**: Make the propose workflow grill first (aligned to the grilling method — one question at a time, recommended answer) and then write the detailed proposal from the grilling output, fetching the proposal template after grilling.
- **Requirements**:
  - The propose template SHALL instruct grilling the user (one question at a time, recommended answer provided, resolve every decision-tree branch) BEFORE writing the proposal.
  - The propose template SHALL instruct fetching `bp template proposal --stdout` AFTER grilling and filling every section from the grilling output.
  - Trivial/light changes SHALL retain a skip path for grilling.
- **Constraints**: Keep `## Steps` / `## Guardrails`, `CONTEXT_JSONL_REMINDER`, and the "auto-injected by the OMP Extension" phrase. The Step-0 risk/level assignment stays.
- **Acceptance Criteria**: The propose `instructions` contain a grilling Step (keyword `grill` / `one question at a time` / `recommended answer`) ordered before the Step that runs `bp template proposal --stdout`, and contain a skip-for-trivial/light note.
- **Key Interfaces**: `getProposeSkillTemplate`, `getProposeCommandTemplate`
- **Detailed Design**:
  - `src/templates/workflows/propose.ts`: reorder/rename Steps so that:
    - Step 0: risk assessment and level assignment (unchanged).
    - Step 1: **Grill the user** — keep the one-question-at-a-time + recommended-answer protocol; explicitly align wording to "the grilling method (one question at a time, recommended answer, resolve every branch)". Keep the trivial/light skip path.
    - Step 1b: technical research (unchanged).
    - Step 2: create change directory (unchanged).
    - Step 3: write the detailed proposal — emphasize "fetch the template AFTER grilling completes and fill it from the grilling output" (already fetches via `bp template proposal --stdout`; add explicit "from the grilling output" language).
    - Steps 4–5 (verify + commit) unchanged.
  - PR-6 note: this is also the simplification pass target for propose.ts (Wave 5); the DS-15 rewrite should already be lean.

### DS-16: Design template DS-N contract fields + plan Step-4 check

- **Refs**: PR-4
- **Source**: PR-4 (proposal.md)
- **Responsibility**: Add explicit Requirements / Constraints / Acceptance Criteria fields to every DS-N in the design template, instruct the planner to fill them, and have the plan step's quality review verify their presence.
- **Requirements**:
  - The `DESIGN_TEMPLATE` DS-N block SHALL include `**Requirements**:`, `**Constraints**:`, and `**Acceptance Criteria**:` fields.
  - `PLANNER_PROMPT` SHALL instruct the planner to fill all three fields for every DS-N.
  - The plan workflow Step-4 quality review SHALL check that every DS-N carries the three fields.
- **Constraints**: The plan-review domain keeps its five-dimension structure; the DS-N field check is added to Dimension 1 (Implementability) questions. The `bp template design --stdout` template and the planner prompt are the two artifacts that must stay in sync.
- **Acceptance Criteria**: `bp template design --stdout` contains `**Requirements**:`, `**Constraints**:`, `**Acceptance Criteria**:` in the DS-N block; `PLANNER_PROMPT` mentions all three field names; `plan.ts` Step-4 Dimension 1 asks about their presence.
- **Key Interfaces**: `DESIGN_TEMPLATE`, `PLANNER_PROMPT`, plan.ts Step 4
- **Detailed Design**:
  - `src/templates/artifacts/index.ts` `DESIGN_TEMPLATE`: after `- **Responsibility**:` add three bullet fields with explanatory comments:
    - `- **Requirements**: <what this component must satisfy - observable behaviors>`
    - `- **Constraints**: <hard limits - protocols, boundaries, non-negotiables>`
    - `- **Acceptance Criteria**: <binary pass/fail - "X happens when Y">`
    - Update the DS-N rules comment to say "Each DS-N has: refs, Source, Responsibility, Requirements, Constraints, Acceptance Criteria".
  - `src/templates/agents/index.ts` `PLANNER_PROMPT`: in the DS-N section, instruct: "Fill Requirements, Constraints, and Acceptance Criteria for every DS-N; acceptance criteria must be binary pass/fail." Also add these fields to the implementability self-check (Step 6) so the planner verifies each DS-N carries them.
  - `src/templates/workflows/plan.ts` Step 4 Dimension 1 (Implementability): add the question "Do Requirements, Constraints, and Acceptance Criteria exist for every DS-N?" and a FAIL example (e.g. "DS-N lists only Responsibility + Key Interfaces with no acceptance bar"). Keep five dimensions.

### DS-17: Roadmap template lightweight grilling

- **Refs**: PR-5
- **Source**: PR-5 (proposal.md)
- **Responsibility**: Replace the roadmap template's full "relentless" interview with a lightweight grilling that determines project direction and agrees milestones/phases, deferring detailed requirements to each change's propose step.
- **Requirements**:
  - The roadmap template Step 1 SHALL conduct a lightweight grilling (project direction + milestone/phase agreement), SHALL ask one question at a time with a recommended answer, and SHALL defer detailed requirement capture (features/edge-cases/failure-modes) to per-change propose steps.
- **Constraints**: Keep `## Steps` / `## Output` / `## Guardrails` structure; keep the milestone/phase templates (Step 5) and Validate logic (Step 6) intact. The `grill` project-step classification in the context spec is unchanged.
- **Acceptance Criteria**: The roadmap `instructions` Step 1 is a lightweight grilling block mentioning direction + milestone/phase agreement and explicitly deferring requirement detail to propose; it does NOT contain the full "edge cases / failure modes" interview list.
- **Key Interfaces**: `getRoadmapSkillTemplate`, `getRoadmapCommandTemplate`
- **Detailed Design**:
  - `src/templates/workflows/roadmap.ts`: replace Step 1 (the full RELENTLESS interview with the 8-bullet grill list) with a lightweight version:
    - Title: "### Step 1: Lightweight grilling — direction and milestone agreement"
    - Ask ONE question at a time with a recommended answer. Resolve: (a) what is this project for (direction), (b) what milestone/phase skeleton the user wants, (c) which discussed items are future intentions (M2+ placeholders).
    - Explicit note: "Detailed feature/edge-case/failure-mode requirements are captured per-change in each propose step (bp propose) — do not grill them here."
  - Keep Step 2 (context) through Step 6 (validate) unchanged.

### DS-18: Workflow template + agent prompt simplification pass

- **Refs**: PR-6
- **Source**: PR-6 (proposal.md)
- **Responsibility**: Simplify every workflow template body and every agent prompt so each instruction says one thing plainly, removing boilerplate and repetition while preserving the behavioral contract and all asserted keywords.
- **Requirements**:
  - Every workflow template (`init`, `roadmap`, `propose`, `plan`, `apply`, `check`, `archive`, `continue`, `ff`, `loop`, `refactor`) SHALL be trimmed to one-sentence-per-point prose.
  - Every agent prompt (`PLANNER_PROMPT`, `EXECUTOR_PROMPT`, `REVIEWER_PROMPT`, `CODEBASE_SCANNER_PROMPT`, `REFACTORER_PROMPT`, `FIXER_PROMPT`) SHALL be trimmed the same way.
  - Repeated context/level/guardrail blocks SHALL be deduplicated into `shared.ts` constants where shared.
  - The section headers `## Input`, `## Steps`, `## Output`, `## Guardrails` (templates) and `## Role` etc. (agents) SHALL be preserved in order.
- **Constraints**: All asserted keywords stay present — `auto-injected by the OMP Extension`, `CONTEXT_JSONL_REMINDER` placement before `## Input`, `bp refactor analyze`, `behavior preserv`, `STOP after ONE module`, `write \`context\.jsonl\``, `check every row's \`reason\` is still satisfied`, etc. Snapshot churn is expected and deliberate (regenerate via `npx vitest run --update`).
- **Acceptance Criteria**: Full test suite passes after regeneration; `git diff` on templates/agents trims prose only (no guardrail removed, no `## ` header lost); no template contains a duplicated multi-line boilerplate block that could move to `shared.ts`.
- **Key Interfaces**: all workflow template getters, all agent prompts, `shared.ts`
- **Detailed Design**:
  - **Dedupe (shared.ts)**: `src/templates/workflows/shared.ts` already holds `CHANGE_NAME_RESOLVE`, `CLASSIFY_CHANGE`, `CONTEXT_JSONL_REMINDER`. Add a shared `REVIEW_ARTIFACT_NOTE` constant (e.g. "Review artifact stays named `review.md`.") if repeated across check/archive; otherwise only reuse existing constants. Do not over-abstract — only extract blocks repeated verbatim in ≥2 templates.
  - **Templates**: walk each template in `src/templates/workflows/*.ts`; for each `### Step` keep the instruction and prune duplicated explanations, hedge words ("Do NOT", "ALWAYS" retained where they are real guardrails), and repeated level tables. Keep `ORCHESTRATOR_RULE` and `CONTEXT_JSONL_REMINDER` prefixes. Preserve `## Output` sections. Keep asserted substrings from `tests/templates/*.test.ts`.
  - **Agent prompts**: `src/templates/agents/index.ts` — trim each prompt's prose to one sentence per point while keeping `## Role`, `## Core Principles` (or `## Input`/`## Behaviors` per prompt), `## Execution Flow` steps, `## Guardrails`/`## Common Pitfalls`, and every asserted keyword from `tests/templates/agents-*.test.ts` and `bp/specs/templates/spec.md`.
  - Regenerate all platform snapshots and the committed generated files (`.claude/agents/*.md`, `.omp/`, `.agent/`, `.agents/`, `.claude/commands/`) via `bp update`; run the full suite; confirm green.

## Architecture Decisions

### D-1: Keep `review` as the schema completion enum and artifact name, rename only the step

- **Status**: ACCEPTED
- **Decision**: The step/command/registry/template key is renamed `review`→`check`, but the schema `completion` enum values `review_exists`/`review_pass`, the `review.md` artifact file, the `reviewer` agent role, and `ARTIFACT_TEMPLATES['review']` keep the `review` name.
- **Reason**: The locked user decision bounds the rename to the step surface; the artifact file, the reviewer role, and the completion-detection semantics all refer to the *artifact* and would otherwise force an unnecessary cascade through review.md parsers, bp-finish verdict regexes, and reviewer dispatch.
- **Alternatives**: Rename `review_exists`→`check_exists` and `reviewer`→`checker` (rejected: breaks artifact semantics and reviewer role contract for no behavior gain).

### D-2: Fixer is a sub-agent role only — no `bp fix` command, no `fix` registry step

- **Status**: ACCEPTED
- **Decision**: `AGENT_PROMPTS['fixer']`, per-platform `bp-fixer.md` agent files, OMP `detectAgentType` fixer branch, and `bp dispatch fixer` are added; no `bp fix` CLI command and no `WORKFLOW_REGISTRY` entry for a `fix` step.
- **Reason**: Mirrors the refactorer precedent (sub-agent without a lifecycle command, dispatched via `bp dispatch`) and matches the locked decision. A CLI command would imply a user-facing lifecycle step and invite a second fix pathway.
- **Alternatives**: `bp fix <name>` command (rejected by user), registry `fix` step (would appear in `bp continue` and platform step files — not wanted).

### D-3: Archive check is an orchestrated step in the archive template, not a sub-agent

- **Status**: ACCEPTED
- **Decision**: The archive workflow template gains an orchestrator-executed archive-check Step (scan proposal/design/implementation → ADD/MODIFY the change's delta specs to match reality) before `bp finish`. No new sub-agent, no new command.
- **Reason**: The check is a read-compare-edit of the change's own artifacts; an orchestrator can do it directly. Keeps the archive command read-only on code and avoids a new agent role for a mechanical reconciliation.
- **Alternatives**: New `bp-archiver` sub-agent (rejected by user), a new `bp archive-check` command (adds command surface without a lifecycle step).

### D-4: Non-PASS review routes uniformly to `bp check` (D/R/Q/G collapsed)

- **Status**: ACCEPTED
- **Decision**: `bp continue` routes any non-PASS review to `bp check <name>`; the previous `plan --fix` (D) vs `apply --fix` (R/Q/G) split is deleted because the fixer repairs proposal/design/implementation together.
- **Reason**: With a single fixer repairing all three artifacts, the D/R/Q/G routing distinction is meaningless — one route suffices and removes two dead `--fix` modes.
- **Alternatives**: Keep `plan --fix` for D issues and `apply --fix` for R/Q/G (rejected: creates two overlapping fix pathways and contradicts the fixer design).

### D-5: OMP fixer session augments context with context.jsonl rows (executor-style)

- **Status**: ACCEPTED
- **Decision**: The fixer agent type renders the executor-style context.jsonl row inlining (paths + reasons) in the `<bp-context>` block.
- **Reason**: The fixer needs the same "which files matter" reference list as the executor; reusing the executor branch keeps `extension-runtime.ts` and its ES5 mirror minimal and avoids inventing a new augmentation contract.
- **Alternatives**: A dedicated `## Review Issues` augmentation that inlines review.md issues (rejected: would require a new review.md parser in the extension and mirror for little gain — the fixer reads review.md itself).

### D-6: Phase enum value `review`→`check` in context.jsonl / gates

- **Status**: ACCEPTED
- **Decision**: The context phase value, `CONTEXT_PHASES`, `currentPhase` unions, and `gateContextJsonl` phase type rename `review`→`check`.
- **Reason**: The step rename is complete; leaving `review` as a phase would strand `bp check` gating and context.jsonl row filtering on an obsolete step name. Existing context.jsonl files are regenerated as part of the change.
- **Alternatives**: Keep `review` phase and add `check` (rejected: leaves a dead phase in the schema; the proposal names the context/state specs as affected).

### D-7: DS-N contract fields added to Dimension 1, not a sixth dimension

- **Status**: ACCEPTED
- **Decision**: The plan Step-4 quality review checks DS-N Requirements/Constraints/Acceptance-Criteria inside Dimension 1 (Implementability) rather than adding a new dimension.
- **Reason**: The acceptance bar is part of "can an executor build it without guessing"; adding a dimension would ripple the plan-review spec's "exactly five dimensions" contract and the plan.ts Step-4 text more broadly.
- **Alternatives**: A sixth "DS-N Contract Completeness" dimension (rejected: more spec churn for a check that is naturally part of implementability).

## Technical Approach

### Architecture Diagram

```text
                    ┌──────────────────────────────────────────────┐
                    │   WORKFLOW_REGISTRY  [MODIFIED]               │
                    │   'check' (was 'review') -> check.ts [NEW]    │
                    └───────────────────┬──────────────────────────┘
                                        │ command()/skill()
        ┌───────────────┬───────────────┼───────────────┬──────────────────┐
        ▼               ▼               ▼               ▼                  ▼
[EXISTING]        [MODIFIED]       [MODIFIED]      [MODIFIED]          [MODIFIED]
bp propose        bp plan         bp apply         bp check           bp archive
(grilling-first,  (Step-4 DS-N    (no --fix)      (full verify +      (archive-check
 PR-4)            fields PR-4)                    fixer loopback +      Step + bp finish
                                                   full re-review)     PR-3)
        │                │              │               │                  │
        │                │              │               ▼                  │
        │                │              │        ┌─────────────┐          │
        │                │              │        │ bp-reviewer │[EXISTING]│
        │                │              │        │  full triple│          │
        │                │              │        │  re-review  │          │
        │                │              │        └──────┬──────┘          │
        │                │              │          non-PASS               │
        │                │              │               ▼                 │
        │                │              │        ┌─────────────┐          │
        │                │              │        │  bp-fixer   │[NEW]     │
        │                │              │        │ (fixes prop/│          │
        │                │              │        │  design/impl)│         │
        │                │              │        └──────┬──────┘          │
        │                │              │               │ (re-dispatch)   │
        │                │              │               ▼                 │
        │                │              │        bp-reviewer (full re-    │
        │                │              │        review) → PASS → bp      │
        │                │              │        archive                  │
        ▼                ▼              ▼                 │               ▼
[MODIFIED] bp continue ─────────────── routing ────────▶ bp check (was   │
(schema 'check', fix-routing -> bp check)                plan/apply --fix)│
                                                        (PR-1, PR-2)      │
                                        ┌──────────────────────────────────┘
                                        ▼
                              [MODIFIED] platform generators
                              (steps: check; agents: +fixer)
                              (omp/claude-code/agent/opencode/codex)
                              [MODIFIED] OMP detectAgentType +fixer
```

### Core Data Structures

```typescript
// registry.ts — renamed key
export const WORKFLOW_REGISTRY = {
  // ...
  check: { skill: getCheckSkillTemplate, command: getCheckCommandTemplate },
  // ...
} as const satisfies Record<string, WorkflowEntry>;

// schema.ts — renamed step
steps: [
  { id: 'apply', requires: ['tasks'], command: 'apply', completion: 'tasks_all_checked', tracks: 'tasks.md', dispatch: 'executor' },
  { id: 'check', requires: ['apply'], command: 'check', completion: 'review_exists', dispatch: 'reviewer' },
  { id: 'archive', requires: ['check'], command: 'archive', completion: 'review_pass' },
],

// context phase — renamed value
export const CONTEXT_PHASES = ['plan', 'apply', 'check', 'archive', 'all'] as const;

// agents/index.ts — new role
export const AGENT_PROMPTS: Record<string, string> = {
  // ...
  fixer: FIXER_PROMPT,
};

// extension-runtime.ts — widened type
export type AgentType = 'planner' | 'executor' | 'reviewer' | 'refactorer' | 'fixer' | 'default';
```

### Data Flow

1. Orchestrator runs `bp check <name>` (DS-4) → prints `WORKFLOW_REGISTRY['check'].command().content` (DS-1).
2. `bp continue` on an implemented-but-unreviewed change returns `bp check <name>` (DS-3) → prints the same instructions.
3. Orchestrator executes check steps: pre-check verify → classify → dispatch `bp-reviewer` for a full triple review → read `bp/changes/$1/review.md`.
4. If verdict is FAIL/NEEDS_REVISION: orchestrator runs `bp dispatch fixer --change $1` (DS-10) → `bp-fixer` sub-agent (DS-7, DS-9) repairs proposal/design/implementation → orchestrator re-dispatches `bp-reviewer` for a full re-review. Loop until PASS or round cap.
5. On PASS: orchestrator asks the user, then runs `bp archive <name>` → archive template (DS-13) → archive-check Step reconciles `specs/<domain>/spec.md` against reality → `bp finish <name>` (DS-12) merges delta specs and archives.
6. `bp roadmap` / `bp propose` use their reformed templates (DS-17 / DS-15); `bp plan` runs the DS-N field dimension (DS-16).

### Interface Design

#### `bp check [name]` — change verification step

- **Parameters**: `name` (optional change name), `--ci` (CI mode). `--fix` removed.
- **Request**: `bp check my-change`
- **Response 200**: stdout = `WORKFLOW_REGISTRY['check'].command().content` (full workflow instructions) + `Change: my-change` header.
- **Errors**:
  - `Not in a blueprint project. Run "bp init" first.` → exit 1.
  - `Change "<name>" not found.` → exit 1.
  - `Tasks not fully implemented: N/M tasks complete.` → exit 1 (gate).
  - `Pre-Archive Checklist incomplete: N/M items checked.` → exit 1 (gate).
  - context.jsonl invalid for phase `check` → exit 2.
- **Source**: specs/templates/spec.md#Check-Step-Rename

#### `bp finish [name]` — archive executor (was `bp finalize`)

- **Parameters**: `name` (optional change name), `--dry-run`, `--ci`.
- **Request**: `bp finish my-change`
- **Response 200**: `✓ Archived my-change`, `- N delta spec(s) merged into bp/specs/`, `- Change moved to bp/changes/archive/<date>-my-change/`, optional `- Phase COMPLETED` / `- Milestone SHIPPED`, `- ✓ Codebase map refreshed`.
- **Errors**:
  - `Cannot archive: review.md not found for "<name>". Run "bp check" first.` → exit 1.
  - `Cannot archive: review verdict is X (expected PASS). Fix issues first: bp check <name>` → exit 1.
  - `Cannot archive: N unresolved issue(s) in review.md. Fix issues first: bp check <name>` → exit 1.
  - `Merge conflict in specs/<domain>/spec.md` → exit 1.
  - Critical approval gate errors → exit 1.
- **Source**: specs/archive/spec.md#Finish-Command

#### `bp dispatch fixer [--change <name>]` — fixer sub-agent dispatch

- **Parameters**: `--change <name>` (optional), `--dir <path>` (default `bp`).
- **Request**: `bp dispatch fixer --change my-change`
- **Response 200**: per-platform `## Dispatch: bp-fixer (<platform>)` block with tool params, `### Isolation` (executor-style), `### Model Selection`, and `context: Change my-change at bp/changes/my-change/`.
- **Errors**: no `--target` required (only `refactorer` requires it); unknown platform silently skipped (existing behavior).
- **Source**: specs/platform-gen/spec.md#Fixer-Platform-Generation

#### `bp template check --stdout` / `bp template review --stdout`

- **Request**: `bp template check --stdout` → prints `WORKFLOW_REGISTRY['check'].command().content`.
- **Request**: `bp template review --stdout` → prints `ARTIFACT_TEMPLATES['review']` (review.md artifact template) — unchanged.
- **Errors**: unknown type → `Unknown template type: X.` exit 1.
- **Source**: specs/templates/spec.md#Check-Step-Rename

## External Dependencies

No external dependencies.

## Impact Analysis

### Direct Impacts

- `src/templates/workflows/review.ts` → renamed `check.ts` with fixer loopback content (DS-1).
- `src/templates/workflows/registry.ts`: key `review`→`check`, import renamed (DS-2).
- `src/core/schema.ts`: step id/command `review`→`check`, archive requires `['check']` (DS-2).
- `src/core/continue.ts`: routing + fix-routing relocation (DS-3).
- `src/commands/bp-review.ts` → renamed `bp-check.ts`; `--fix` removed; phase `check` (DS-4).
- `src/commands/bp-finalize.ts` → renamed `bp-finish.ts`; messages reference `bp check` (DS-12).
- `src/commands/bp-state.ts`: `nextAction` `bp check` (DS-3).
- `src/commands/bp-template.ts`: `STEP_TO_WORKFLOW['check']` (DS-6).
- `src/commands/_utils.ts`, `src/core/artifact-validator.ts`, `src/core/context-jsonl-io.ts`, `src/types/context-jsonl-io.ts`: phase `review`→`check` (DS-4).
- `src/commands/bp-apply.ts`, `src/commands/bp-plan.ts`: `--fix` removed (DS-11).
- 6 platform step generators: `review`→`check` step entries (DS-5).
- 4 platform agent generators + OMP extension runtime/template: `fixer` role + detection (DS-9).
- `src/commands/bp-dispatch.ts`: `fixer` in `isExecutorLike` + `ROLE_TEMPLATES` (DS-10).
- `src/templates/workflows/archive.ts`: archive-check step + `bp finish` (DS-13).
- `src/templates/workflows/propose.ts` (DS-15), `plan.ts` (DS-16), `roadmap.ts` (DS-17).
- `src/templates/artifacts/index.ts`: `DESIGN_TEMPLATE` DS-N fields + `REVIEW_TEMPLATE` routing (DS-16, DS-11).
- `src/templates/agents/index.ts`: `FIXER_PROMPT` + `AGENT_PROMPTS['fixer']`, reviewer fix-mode removal, `--fix` removal, simplification (DS-7, DS-8, DS-11, DS-18).
- `bp/specs/archive/spec.md`: command-surface repair (DS-14).
- Committed generated files: `.claude/commands/bp-check.md` (new), `.claude/commands/bp-review.md` (deleted), `.claude/agents/bp-fixer.md` (new), `.claude/agents/bp-reviewer.md` (regenerated), `.omp/commands|skills|agents/*`, `.agent/`, `.agents/` equivalents (regenerated via `bp update`).

### Indirect Impacts (callers/dependents)

- `src/core/continue.ts` → `getWorkflowInstructions` callers (`bp-apply.ts`, `bp-plan.ts`, `bp-continue.ts`, `bp-archive.ts`, `bp-check.ts`) resolve `check` via the registry; no signature change.
- `src/commands/bp-state.ts` → OMP extension `formatStateSummary` picks up `bp check` nextAction automatically (no change needed beyond DS-3).
- `src/integrations/*` snapshots → all platform snapshots and the generators multi-platform snapshot churn (regenerate).
- `tests/core/continue.test.ts` → verdict-routing assertions change from `plan --fix`/`apply --fix` to `check`; "suggests review" → "suggests check".
- `tests/templates/workflow-apply-review.test.ts` → imports `check.js`, asserts no `Run \`bp context check\`` self-call.
- `tests/commands/bp-dispatch.test.ts` → add fixer dispatch assertions (existing reviewer/refactorer tests unchanged).
- `tests/integration/lifecycle.test.ts` → `bp finalize` → `bp finish`; `bp review` → `bp check` in step-6/step-8 invocations.
- `tests/integration/refactor-flow.test.ts` → unaffected (refactorer flow separate).
- `tests/e2e/SKILL.md` and `tests/e2e/*.test.ts` → pipeline diagram step name `review`→`check`; reviewer/executor/planner OMP augmentation assertions unchanged but fixer branch is new.

### Test Impacts

- `tests/core/continue.test.ts`: "all tasks done without review suggests review" → `check`; verdict-routing tests (`plan --fix`/`apply --fix`) → `bp check`.
- `tests/templates/workflow-apply-review.test.ts`: rename import to `getCheckCommandTemplate`; the review test becomes a check test.
- `tests/commands/bp-dispatch.test.ts`: add `bp dispatch fixer` isolation test (executor-style).
- `tests/integration/lifecycle.test.ts`: `finalize`→`finish`, `review`→`check`.
- `tests/templates/agents-reviewer.test.ts`, `agents-planner.test.ts`, `agents-executor.test.ts`, `agents-refactorer.test.ts`: must still pass after prompt simplification — asserted keywords preserved.
- New integration tests: check→fixer→full re-review fixture; archive-check (ADD/MODIFY) then `bp finish` fixture.
- Snapshot regeneration across all platforms + generators.

## File Manifest

| File Path | Description | Action | Source |
|-----------|-------------|--------|--------|
| `src/templates/workflows/check.ts` | Renamed check-step template with fixer loopback + full re-review (was `review.ts`) | Create | DS-1 |
| `src/templates/workflows/review.ts` | Deleted (renamed to `check.ts`) | Delete | DS-1 |
| `src/templates/workflows/registry.ts` | Registry key `review`→`check`, import renamed | Modify | DS-2 |
| `src/core/schema.ts` | Default schema step `review`→`check`, archive requires `['check']` | Modify | DS-2 |
| `src/core/continue.ts` | Routing `check` + fix-routing relocation (remove plan/apply --fix) | Modify | DS-3 |
| `src/commands/bp-check.ts` | Renamed `bp check` command, `--fix` removed (was `bp-review.ts`) | Create | DS-4 |
| `src/commands/bp-review.ts` | Deleted (renamed to `bp-check.ts`) | Delete | DS-4 |
| `src/commands/bp-finish.ts` | Renamed `bp finish` command (was `bp-finalize.ts`) | Create | DS-12 |
| `src/commands/bp-finalize.ts` | Deleted (renamed to `bp-finish.ts`) | Delete | DS-12 |
| `src/cli.ts` | Register `check` + `finish` | Modify | DS-4, DS-12 |
| `src/commands/_utils.ts` | `gateContextJsonl` phase union `check` | Modify | DS-4 |
| `src/core/artifact-validator.ts` | `currentPhase` union `check` (keep artifact `review` case) | Modify | DS-4 |
| `src/core/context-jsonl-io.ts` | `CONTEXT_PHASES` + `currentPhase` `check` | Modify | DS-4 |
| `src/types/context-jsonl-io.ts` | `CONTEXT_PHASES` `check` | Modify | DS-4 |
| `src/commands/bp-state.ts` | nextAction `bp check` | Modify | DS-3 |
| `src/commands/bp-template.ts` | `STEP_TO_WORKFLOW['check']` | Modify | DS-6 |
| `src/commands/bp-apply.ts` | Remove `--fix` option | Modify | DS-11 |
| `src/commands/bp-plan.ts` | Remove `--fix` option | Modify | DS-11 |
| `src/commands/bp-dispatch.ts` | `fixer` in `isExecutorLike` + `ROLE_TEMPLATES` | Modify | DS-10 |
| `src/templates/workflows/apply.ts` | Remove `--fix`, `Next: bp check` | Modify | DS-11 |
| `src/templates/workflows/plan.ts` | Remove `--fix`, add DS-N contract dimension (Step 4) | Modify | DS-11, DS-16 |
| `src/templates/workflows/archive.ts` | Archive-check step + `bp finish` | Modify | DS-13 |
| `src/templates/workflows/propose.ts` | Grilling-first + grilling-aligned write | Modify | DS-15 |
| `src/templates/workflows/roadmap.ts` | Lightweight grilling Step 1 | Modify | DS-17 |
| `src/templates/workflows/refactor.ts` | Guardrail `review`→`check` + simplification | Modify | DS-18 |
| `src/templates/workflows/ff.ts` | Gate `bp review`→`bp check` + simplification | Modify | DS-18 |
| `src/templates/workflows/loop.ts` | Gate `bp review`→`bp check` + simplification | Modify | DS-18 |
| `src/templates/workflows/init.ts` | Simplification | Modify | DS-18 |
| `src/templates/workflows/continue.ts` | Simplification | Modify | DS-18 |
| `src/templates/workflows/shared.ts` | Dedupe shared blocks (e.g. review-artifact note) | Modify | DS-18 |
| `src/templates/agents/index.ts` | `FIXER_PROMPT`, `AGENT_PROMPTS['fixer']`, reviewer fix-mode removal, `--fix` removal, simplification | Modify | DS-7, DS-8, DS-11, DS-18 |
| `src/templates/artifacts/index.ts` | `DESIGN_TEMPLATE` DS-N fields + `REVIEW_TEMPLATE` routing | Modify | DS-16, DS-11 |
| `src/integrations/omp/commands.ts` | Step `check` | Modify | DS-5 |
| `src/integrations/omp/skills.ts` | Step `check` | Modify | DS-5 |
| `src/integrations/omp/agents.ts` | Add `fixer` AGENT_DEF | Modify | DS-9 |
| `src/integrations/omp/extension-runtime.ts` | `AgentType` + `detectAgentType` + render fixer | Modify | DS-9 |
| `src/templates/omp/extension.tmpl.ts` | Mirror fixer branch | Modify | DS-9 |
| `src/integrations/claude-code/commands.ts` | Step `check` | Modify | DS-5 |
| `src/integrations/claude-code/agents.ts` | Add `fixer` AGENT_DEF | Modify | DS-9 |
| `src/integrations/agent/skills.ts` | Step `check` | Modify | DS-5 |
| `src/integrations/agent/agents.ts` | Add `fixer` AGENT_DEF | Modify | DS-9 |
| `src/integrations/opencode/commands.ts` | Step `check` | Modify | DS-5 |
| `src/integrations/opencode/agents.ts` | Add `fixer` AGENT_DEF | Modify | DS-9 |
| `src/integrations/codex/skills.ts` | Step `check` | Modify | DS-5 |
| `.claude/commands/bp-check.md` | Generated check command file | Create | DS-5 |
| `.claude/commands/bp-review.md` | Removed generated file | Delete | DS-5 |
| `.claude/agents/bp-fixer.md` | Generated fixer agent file | Create | DS-7 |
| `.claude/agents/bp-reviewer.md` | Regenerated (fix mode removed) | Modify | DS-8 |
| `.claude/agents/bp-planner.md`, `bp-executor.md`, `bp-codebase-scanner.md`, `bp-refactorer.md` | Regenerated (simplification) | Modify | DS-18 |
| `.omp/commands/bp-check.md`, `.omp/skills/bp-check/SKILL.md`, `.omp/agents/bp-fixer.md` and all other `.omp/*` | Regenerated | Modify | DS-5, DS-9, DS-18 |
| `.agent/skills/bp-check/SKILL.md`, `.agent/agents/bp-fixer.md` and other `.agent/*` | Regenerated | Modify | DS-5, DS-9, DS-18 |
| `.agents/skills/bp-check/SKILL.md` (codex) and other `.agents/*` | Regenerated | Modify | DS-5, DS-18 |
| `bp/specs/archive/spec.md` | Repair command surface (`bp finish`, `bp check`) | Modify | DS-14 |
| `bp/changes/workflow-reform/specs/templates/spec.md` | Delta spec | Create | — |
| `bp/changes/workflow-reform/specs/context/spec.md` | Delta spec | Create | — |
| `bp/changes/workflow-reform/specs/state/spec.md` | Delta spec | Create | — |
| `bp/changes/workflow-reform/specs/archive/spec.md` | Delta spec | Create | — |
| `bp/changes/workflow-reform/specs/plan-review/spec.md` | Delta spec | Create | — |
| `bp/changes/workflow-reform/specs/platform-gen/spec.md` | Delta spec | Create | — |
| `tests/core/continue.test.ts` | Routing assertions `check` | Modify | DS-3 |
| `tests/templates/workflow-apply-review.test.ts` | Import `check.js`, rename test | Modify | DS-1 |
| `tests/commands/bp-dispatch.test.ts` | Add fixer dispatch test | Modify | DS-10 |
| `tests/integration/lifecycle.test.ts` | `finalize`→`finish`, `review`→`check` | Modify | DS-4, DS-12 |
| `tests/integration/check-fixer-rereview.test.ts` | check→fixer→full re-review fixture | Create | DS-7, DS-10 |
| `tests/integration/archive-check-finish.test.ts` | archive-check ADD/MODIFY then finish | Create | DS-13 |
| `src/integrations/*/__snapshots__/*.snap` | Regenerated snapshots | Modify | DS-5, DS-9, DS-18 |
| `src/generators/__snapshots__/*.snap` | Regenerated snapshots | Modify | DS-5, DS-9, DS-18 |

## TDD Strategy

- **behavior tasks**: RED → GREEN → REFACTOR (3 commits per task) for DS-1..DS-17 (step renames, fixer role, dispatch, archive reform, planning fields, roadmap/grilling content).
- **refactor tasks**: verify tests pass → refactor → verify again for DS-18 (simplification pass) and the snapshot regeneration subtasks.
- **docs tasks**: direct implementation for DS-14 (archive spec repair).
- **Testing challenges**:
  - Snapshot churn across 5 platforms is the largest test surface — regenerate deliberately and review the diff trims prose only (no behavior change).
  - The check→fixer→re-review integration test needs a fixture whose reviewer returns a non-PASS verdict; keep the fixture minimal (one R issue) and assert the check instructions + fixer dispatch + reviewer full re-review keywords rather than executing the LLM.
  - The archive-check test asserts delta-spec ADD/MODIFY changes are reflected in the merged global spec after `bp finish` (pure code path, no LLM).
  - Regression/spec-drift audit: after the rename + simplification, run a contract-preservation pass (the review gate for this change) that checks asserted template keywords (`## Input/## Steps/## Output/## Guardrails` order, `auto-injected by the OMP Extension`, `CONTEXT_JSONL_REMINDER` placement, `bp refactor analyze`, `behavior preserv`, `STOP after ONE module`, `check every row's \`reason\``) and `bp continue` routing to `check` — this is the explicit regression gate for the critical level.

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Missed `review` step-name reference (docs, snapshots, continue, bp-state, bp-template) leaves a half-renamed state | Lifecycle inconsistency; `bp continue` routes to a dead step | Med | grep every `review` step-name reference (registry, schema, continue, bp-state, bp-template, 6 step generators, refactor/ff/loop/apply templates, REVIEW_TEMPLATE); full suite + snapshots must pass; contract-preservation pass in review |
| Prompt simplification drops an asserted keyword/guardrail (PR-6) | Test failure or silent contract drift | Med | Keep the asserted-substring checklist in DS-18; regenerate snapshots deliberately; reviewer contract-preservation check confirms no guardrail removed |
| `bp continue` routes to wrong step after rename (FUSE + fix-routing branches) | User stuck in a dead loopback | Med | Update continue.ts fix-routing in one task (DS-3); integration test asserts `check` next-step for verdict routing |
| Archive check edits delta specs then `bp finish` conflicts | Archive blocked on a merge conflict | Med | Archive-check writes only to `specs/<domain>/spec.md` delta files; finish re-verifies merge; conflict → resolve in delta spec and re-run (existing guardrail) |
| Phase rename `review`→`check` breaks in-flight context.jsonl files | `bp check` gate rejects stale rows | Low | This change regenerates its own context.jsonl with `check`; no in-flight changes at HEAD; document the phase migration in the context delta spec |
| Reviewer/fixer role confusion — fixer marking issues `[x]` itself | Review verdict contradiction blocks archive | Low | FIXER_PROMPT guardrail forbids marking issues; reviewer is the only role that marks `[x]` in full re-review |
| `extension.tmpl.ts` mirror drifts from `extension-runtime.ts` | OMP Extension fixer detection differs from tests | Low | Both files changed in one task (DS-9); lockstep header warning; snapshot test pins the bundled source |
