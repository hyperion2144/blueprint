# Tasks: workflow-reform

<!--
  Structured implementation checklist. Produced by the planner agent.
  Executors receive ONE wave at a time and implement its tasks via TDD.
-->

## TDD Type Annotations

| type | Meaning | TDD Protocol | Commit type |
|------|---------|-------------|-------------|
| `behavior` | Business behavior - observable, testable feature | RED -> GREEN -> REFACTOR | test + feat + refactor |
| `config` | Configuration - env vars, CI/CD, lint, tsconfig | Direct implementation | chore |
| `refactor` | Improve structure without changing behavior | Verify tests -> refactor -> verify | refactor |
| `docs` | Documentation - README, API docs, comments | Direct implementation | docs |
| `scaffolding` | Skeleton code - module shells, directory structure | Direct implementation | chore |

## Wave 1: review→check rename (PR-1)

The structural rename layer: check template + registry + schema + routing + CLI + context phase + platform step generators must land together so the lifecycle stays internally consistent.

- [x] T-1: [type:behavior] Check workflow template (rename `review.ts` → `check.ts`; keep `review.md` artifact) <!-- commit: 8810471 -->
  - **refs**: DS-1
  - **spec_ref**: specs/templates/spec.md#Check-Step-Rename
  - **files**: src/templates/workflows/check.ts, src/templates/workflows/review.ts (delete), tests/templates/workflow-apply-review.test.ts
  - **acceptance**: `getCheckCommandTemplate().content` contains `bp dispatch fixer`, a full re-review instruction, and `review.md`; contains no `--fix`; `name` is `bp-check`
  - **RED**:
    - **GIVEN** a fresh checkout with the old `review.ts` module
    - **WHEN** `getCheckCommandTemplate()` is imported and its content inspected
    - **THEN** it resolves (module named `check.ts`, exports `getCheckSkillTemplate`/`getCheckCommandTemplate`, `name: 'bp-check'`)
    - **AND** the content contains `bp dispatch fixer`, a full re-review instruction, and `review.md`, and does NOT contain `--fix` or `bp apply --fix`

- [ ] T-2: [type:behavior] Registry + schema rename (`WORKFLOW_REGISTRY['check']`, schema step `check`) <!-- commit: -->
  - **refs**: DS-2
  - **spec_ref**: specs/templates/spec.md#Check-Step-Rename
  - **files**: src/templates/workflows/registry.ts, src/core/schema.ts, tests/core/continue.test.ts
  - **acceptance**: `WORKFLOW_REGISTRY['check']` resolves; `WORKFLOW_REGISTRY['review']` is undefined; `loadSchema().steps` has `check` before `archive`; archive `requires` = `['check']`
  - **RED**:
    - **GIVEN** the current registry and default schema
    - **WHEN** `WORKFLOW_REGISTRY['check']` is read and `loadSchema()` steps are enumerated
    - **THEN** `check` is a registered key resolving to the check getters
    - **AND** the schema has a step `{ id: 'check', command: 'check' }` and the archive step requires `['check']`
    - **AND** `WORKFLOW_REGISTRY['review']` does not exist
  - **depends_on**: T-1

- [ ] T-3: [type:behavior] Continue routing + state nextAction (`check`, fix-routing relocation) <!-- commit: -->
  - **refs**: DS-3
  - **spec_ref**: specs/templates/spec.md#Check-Step-Rename
  - **files**: src/core/continue.ts, src/commands/bp-state.ts, tests/core/continue.test.ts
  - **acceptance**: `determineNextStepForChange` returns `command` containing `check` for implemented-unreviewed and non-PASS-verdict changes; no `plan --fix`/`apply --fix` emitted; `bp state` nextAction uses `bp check`
  - **RED**:
    - **GIVEN** a change with all tasks done and no review.md
    - **WHEN** `determineNextStepForChange` runs
    - **THEN** `nextStep.command` contains `check`
    - **AND** for a change with a `FAIL` review and open issues, `nextStep.command` contains `check` (not `plan --fix` or `apply --fix`)
  - **depends_on**: T-2

- [ ] T-4: [type:behavior] Check CLI command (`bp-check.ts`, cli registration, `--fix` removed) <!-- commit: -->
  - **refs**: DS-4
  - **spec_ref**: specs/templates/spec.md#Check-Step-Rename
  - **files**: src/commands/bp-check.ts, src/commands/bp-review.ts (delete), src/cli.ts
  - **acceptance**: `bp check <name>` prints the check instructions; `bp review` is an unknown command; `--fix` absent from `--help`
  - **RED**:
    - **GIVEN** an initialized bp project with a fully-implemented change
    - **WHEN** `node src/cli.js check <name>` runs
    - **THEN** stdout contains the check workflow instructions
    - **AND** `node src/cli.js review <name>` exits non-zero with an unknown-command error
  - **depends_on**: T-1

- [ ] T-5: [type:behavior] Context phase rename (`review` → `check` in context.jsonl gates) <!-- commit: -->
  - **refs**: DS-4
  - **spec_ref**: specs/context/spec.md#Check-Phase-Value
  - **files**: src/commands/_utils.ts, src/core/artifact-validator.ts, src/core/context-jsonl-io.ts, src/types/context-jsonl-io.ts
  - **acceptance**: `CONTEXT_PHASES` = `['plan','apply','check','archive','all']`; `gateContextJsonl(...,'check')` accepts a valid `check`-phase file; `validateContextJsonlFile` phase `check` works
  - **RED**:
    - **GIVEN** a change with `context.jsonl` rows using `phase: check`
    - **WHEN** `gateContextJsonl(bpDir, change, 'check')` runs
    - **THEN** it returns `true` (valid)
    - **AND** `CONTEXT_PHASES` contains `'check'` and not `'review'`
  - **depends_on**: T-4

- [ ] T-6: [type:behavior] Platform step generators rename (`review` → `check` across 6 files + snapshots) <!-- commit: -->
  - **refs**: DS-5
  - **spec_ref**: specs/templates/spec.md#Check-Step-Rename
  - **files**: src/integrations/omp/commands.ts, src/integrations/omp/skills.ts, src/integrations/claude-code/commands.ts, src/integrations/agent/skills.ts, src/integrations/opencode/commands.ts, src/integrations/codex/skills.ts, src/integrations/*/__snapshots__/*.snap, src/generators/__snapshots__/*.snap
  - **acceptance**: every step array contains `'check'` and not `'review'`; `bp update` produces `bp-check` command/skill files on all configured platforms; snapshots regenerated
  - **RED**:
    - **GIVEN** the current platform step generators
    - **WHEN** each `STEPS`/`STEP_DEFS` array is inspected and `generateAll` runs for `platform: [omp, claude-code, agent, codex]`
    - **THEN** every array contains `'check'` (no `'review'`) and generated paths include `bp-check.md` / `bp-check/SKILL.md`
    - **AND** no `bp-review` path is generated
  - **depends_on**: T-2

- [ ] T-7: [type:refactor] `bp-template` step mapping (`check` while `review` artifact template stays) <!-- commit: -->
  - **refs**: DS-6
  - **spec_ref**: specs/templates/spec.md#Check-Step-Rename
  - **files**: src/commands/bp-template.ts
  - **acceptance**: `bp template check --stdout` prints the check instructions; `bp template review --stdout` still prints the review.md artifact template
  - **RED**:
    - **GIVEN** the current `STEP_TO_WORKFLOW` map
    - **WHEN** `bp template check --stdout` runs
    - **THEN** stdout contains the check workflow instructions
    - **AND** `bp template review --stdout` still emits the review.md artifact template (`# Review:` header)
  - **depends_on**: T-4

## Wave 2: bp-fixer sub-agent + full re-review (PR-2)

The fixer role, reviewer full-review reform, platform agents/OMP discrimination, dispatch, and `--fix` removal. Depends on Wave 1 so the check step already exists.

- [ ] T-8: [type:behavior] Fixer agent prompt (`FIXER_PROMPT` + `AGENT_PROMPTS['fixer']`, `.claude/agents/bp-fixer.md`) <!-- commit: -->
  - **refs**: DS-7
  - **spec_ref**: specs/templates/spec.md#Fixer-Agent-Role
  - **files**: src/templates/agents/index.ts, .claude/agents/bp-fixer.md
  - **acceptance**: `AGENT_PROMPTS['fixer']` is non-empty and contains `## Role`, `## Inputs`, `## Behaviors`, `## Guardrails`, `review.md`, `proposal.md`, `design.md`; no `bp fix` command registered
  - **RED**:
    - **GIVEN** the current `AGENT_PROMPTS` map
    - **WHEN** `AGENT_PROMPTS['fixer']` is read
    - **THEN** it is a non-empty string with `## Role`, `## Inputs`, `## Behaviors`, `## Guardrails`
    - **AND** it references `review.md`, `proposal.md`, and `design.md`
    - **AND** no `bp fix` command is registered in `src/cli.ts`
  - **depends_on**: T-1

- [ ] T-9: [type:behavior] Reviewer full-review reform (remove Fix Mode / `--fix` from REVIEWER_PROMPT) <!-- commit: -->
  - **refs**: DS-8
  - **spec_ref**: specs/templates/spec.md#Reviewer-Full-Review
  - **files**: src/templates/agents/index.ts, .claude/agents/bp-reviewer.md
  - **acceptance**: `REVIEWER_PROMPT` has no `## Fix Mode` header, no `--fix`, no `[~]` three-state marking; still contains `check every row's \`reason\` is still satisfied`
  - **RED**:
    - **GIVEN** the current `REVIEWER_PROMPT`
    - **WHEN** it is scanned for fix-mode artifacts
    - **THEN** it contains no `## Fix Mode` header, no `--fix` substring, and no `[~]` state marker
    - **AND** it still contains `check every row's \`reason\` is still satisfied`
  - **depends_on**: T-8

- [ ] T-10: [type:behavior] Platform agents generators + OMP fixer discrimination (`bp-fixer.md` on 4 platforms + detectAgentType) <!-- commit: -->
  - **refs**: DS-9
  - **spec_ref**: specs/platform-gen/spec.md#Fixer-Platform-Generation
  - **files**: src/integrations/omp/agents.ts, src/integrations/claude-code/agents.ts, src/integrations/agent/agents.ts, src/integrations/opencode/agents.ts, src/integrations/omp/extension-runtime.ts, src/templates/omp/extension.tmpl.ts, snapshots
  - **acceptance**: each agent generator emits `bp-fixer.md`; `detectAgentType({agentTemplate:'bp-fixer'}) === 'fixer'`; extension template mirror has the same branch; `AgentType` includes `'fixer'`
  - **RED**:
    - **GIVEN** the current agent generators and OMP runtime
    - **WHEN** `detectAgentType({ agentTemplate: 'bp-fixer' })` runs and each platform `generate*Agents` produces files
    - **THEN** the return value equals `'fixer'`
    - **AND** every generated agent file list contains `bp-fixer.md`
    - **AND** `EXTENSION_SOURCE` contains a `"fixer"` detect branch
  - **depends_on**: T-8

- [ ] T-11: [type:behavior] Fixer dispatch support (`bp dispatch fixer`, executor-style isolation) <!-- commit: -->
  - **refs**: DS-10
  - **spec_ref**: specs/platform-gen/spec.md#Fixer-Platform-Generation
  - **files**: src/commands/bp-dispatch.ts, tests/commands/bp-dispatch.test.ts
  - **acceptance**: `bp dispatch fixer --change X` prints a `bp-fixer` dispatch block whose `### Isolation` section matches the executor's isolation type per platform; exits 0
  - **RED**:
    - **GIVEN** an initialized bp project configured for `platform: [omp, claude-code]`
    - **WHEN** `node src/cli.js dispatch fixer --change test-change` runs
    - **THEN** stdout contains `Dispatch: bp-fixer` for each platform
    - **AND** the isolation section matches the executor's isolation type for each platform
  - **depends_on**: T-10

- [ ] T-12: [type:behavior] Fix-loopback removal from apply/plan (+ prompts + review template) <!-- commit: -->
  - **refs**: DS-11
  - **spec_ref**: specs/templates/spec.md#Reviewer-Full-Review
  - **files**: src/commands/bp-apply.ts, src/commands/bp-plan.ts, src/templates/workflows/apply.ts, src/templates/workflows/plan.ts, src/templates/agents/index.ts, src/templates/artifacts/index.ts
  - **acceptance**: no `--fix` substring remains in those files; `bp apply --help` / `bp plan --help` show no `--fix`; apply template says `Next: bp check`
  - **RED**:
    - **GIVEN** the current apply/plan commands, templates, and agent prompts
    - **WHEN** they are scanned for `--fix`
    - **THEN** `bp-apply.ts`, `bp-plan.ts`, `apply.ts`, `plan.ts`, `EXECUTOR_PROMPT`, `PLANNER_PROMPT`, and `REVIEW_TEMPLATE` contain no `--fix`
    - **AND** the apply template's `Next:` line reads `bp check`
  - **depends_on**: T-3

- [ ] T-13: [type:behavior] Integration test: check → fixer → full re-review on a fixture <!-- commit: -->
  - **refs**: DS-7, DS-10
  - **spec_ref**: specs/templates/spec.md#Check-Step-Full-Rereview
  - **files**: tests/integration/check-fixer-rereview.test.ts
  - **acceptance**: the test wires `bp check` instructions → `bp dispatch fixer` → reviewer full re-review and asserts the check content routes a non-PASS verdict to the fixer then a full re-review
  - **RED**:
    - **GIVEN** a fixture change whose `review.md` has an open `- [ ] R1` issue
    - **WHEN** the check workflow instructions are inspected for routing
    - **THEN** they instruct dispatching `bp dispatch fixer --change <name>` for a non-PASS verdict
    - **AND** they instruct re-dispatching the reviewer for a FULL re-review (all three gates), not a fix-mode diff check
  - **depends_on**: T-8, T-11, T-12

## Wave 3: Archive reform — finish + archive check (PR-3)

- [ ] T-14: [type:behavior] Finish command (rename `bp finalize` → `bp finish`) <!-- commit: -->
  - **refs**: DS-12
  - **spec_ref**: specs/archive/spec.md#Finish-Command
  - **files**: src/commands/bp-finish.ts, src/commands/bp-finalize.ts (delete), src/cli.ts
  - **acceptance**: `bp finish <name>` archives a fixture change end-to-end; `bp finalize` is an unknown command; error messages mention `bp check`
  - **RED**:
    - **GIVEN** a change with `review.md` verdict PASS
    - **WHEN** `node src/cli.js finish <name>` runs
    - **THEN** the change directory is moved to `bp/changes/archive/<date>-<name>/` and delta specs are merged
    - **AND** `node src/cli.js finalize <name>` exits non-zero (unknown command)
  - **depends_on**: T-1

- [ ] T-15: [type:behavior] Archive workflow template — orchestrated archive-check step + `bp finish` <!-- commit: -->
  - **refs**: DS-13
  - **spec_ref**: specs/archive/spec.md#Archive-Check-Step
  - **files**: src/templates/workflows/archive.ts, tests/integration/archive-check-finish.test.ts
  - **acceptance**: archive instructions contain an archive-check Step (scan proposal/design/implementation → ADD/MODIFY delta specs) ordered before the `bp finish $1` step; no `bp finalize` substring
  - **RED**:
    - **GIVEN** the current archive template instructions
    - **WHEN** they are parsed for steps
    - **THEN** a Step instructs scanning proposal/design/implementation and ADDing/MODIFYing the change's delta-spec requirements to match reality
    - **AND** that Step appears before the step running `bp finish $1`
    - **AND** the instructions contain no `bp finalize`
  - **depends_on**: T-14

- [ ] T-16: [type:docs] Repair stale `bp/specs/archive/spec.md` command surface <!-- commit: -->
  - **refs**: DS-14
  - **spec_ref**: specs/archive/spec.md#Finish-Command
  - **files**: bp/specs/archive/spec.md
  - **acceptance**: no `blueprint archive` substring remains; `bp finish` and `bp check` appear in the relevant requirements
  - **RED**:
    - **GIVEN** the stale `bp/specs/archive/spec.md`
    - **WHEN** it is scanned
    - **THEN** it contains `bp finish` and `bp check` and contains no `blueprint archive` substring
  - **depends_on**: T-14

## Wave 4: Planning quality + roadmap grilling (PR-4, PR-5)

- [ ] T-17: [type:behavior] Propose template — grilling-first, write proposal from grilling output <!-- commit: -->
  - **refs**: DS-15
  - **spec_ref**: specs/templates/spec.md#Propose-Grilling-First
  - **files**: src/templates/workflows/propose.ts
  - **acceptance**: propose instructions contain a grilling Step (one question at a time + recommended answer) ordered before the `bp template proposal --stdout` fetch; contains a skip-for-trivial/light note
  - **RED**:
    - **GIVEN** the current propose template instructions
    - **WHEN** parsed for step order
    - **THEN** a grilling Step (containing `one question at a time` and `recommended answer`) appears before the step running `bp template proposal --stdout`
    - **AND** the template notes grilling may be skipped for trivial/light changes
  - **depends_on**: T-12

- [ ] T-18: [type:behavior] Design template DS-N contract fields + planner prompt + plan Step-4 dimension <!-- commit: -->
  - **refs**: DS-16
  - **spec_ref**: specs/plan-review/spec.md#DS-N-Contract-Fields
  - **files**: src/templates/artifacts/index.ts, src/templates/agents/index.ts, src/templates/workflows/plan.ts
  - **acceptance**: `bp template design --stdout` contains `**Requirements**:`, `**Constraints**:`, `**Acceptance Criteria**:` in the DS-N block; `PLANNER_PROMPT` mentions all three; `plan.ts` Step 4 Dimension 1 asks about their presence
  - **RED**:
    - **GIVEN** the current design template and planner prompt
    - **WHEN** `bp template design --stdout` runs and `PLANNER_PROMPT` is inspected
    - **THEN** the DS-N block contains `**Requirements**:`, `**Constraints**:`, and `**Acceptance Criteria**:`
    - **AND** `PLANNER_PROMPT` instructs filling all three fields
    - **AND** the plan template Step-4 Dimension 1 lists the DS-N contract fields check
  - **depends_on**: T-12

- [ ] T-19: [type:behavior] Roadmap template — lightweight grilling (direction + milestone agreement, defer requirements) <!-- commit: -->
  - **refs**: DS-17
  - **spec_ref**: specs/templates/spec.md#Roadmap-Lightweight-Grilling
  - **files**: src/templates/workflows/roadmap.ts
  - **acceptance**: roadmap Step 1 is a lightweight grilling block mentioning direction + milestone/phase agreement and explicitly deferring requirement detail to propose; no full edge-cases/failure-modes interview list
  - **RED**:
    - **GIVEN** the current roadmap template instructions
    - **WHEN** Step 1 is inspected
    - **THEN** it instructs a lightweight grilling covering project direction and milestone/phase agreement
    - **AND** it explicitly defers detailed requirements (features/edge cases/failure modes) to per-change propose steps
  - **depends_on**: T-17

## Wave 5: Prompt simplification pass (PR-6)

Runs last over the final structure — every template and agent prompt simplified, asserted keywords preserved.

- [ ] T-20: [type:refactor] Workflow template simplification (dedupe into shared.ts, one sentence per point) <!-- commit: -->
  - **refs**: DS-18
  - **spec_ref**: specs/templates/spec.md#Prompt-Simplification
  - **files**: src/templates/workflows/init.ts, roadmap.ts, propose.ts, plan.ts, apply.ts, check.ts, archive.ts, continue.ts, ff.ts, loop.ts, refactor.ts, shared.ts, snapshots
  - **acceptance**: full test suite passes after regeneration; every template keeps `## Input`, `## Steps`, `## Output`, `## Guardrails` in order plus `auto-injected by the OMP Extension` and `CONTEXT_JSONL_REMINDER` before `## Input`; no duplicated boilerplate block that belongs in shared.ts
  - **RED**:
    - **GIVEN** the pre-simplification templates
    - **WHEN** `workflow-apply-review.test.ts` and `refactor.test.ts` assertions are run against a first simplification attempt
    - **THEN** each template still contains `## Input`, `## Steps`, `## Output`, `## Guardrails` in order
    - **AND** `auto-injected by the OMP Extension` and the `### Context injection (OMP Extension)` block remain before `## Input`
  - **depends_on**: T-1, T-15, T-17, T-18, T-19

- [ ] T-21: [type:refactor] Agent prompt simplification (all 6 prompts + regenerated agent files) <!-- commit: -->
  - **refs**: DS-18
  - **spec_ref**: specs/templates/spec.md#Prompt-Simplification
  - **files**: src/templates/agents/index.ts, .claude/agents/*.md (regenerated), .omp/agents/*.md (regenerated), .agent/agents/*.md (regenerated), snapshots
  - **acceptance**: full test suite passes; `AGENT_PROMPTS['planner'|'executor'|'reviewer'|'codebase-scanner'|'refactorer'|'fixer']` each keep `## Role` + asserted keywords (`write \`context\.jsonl\``, `check every row's \`reason\` is still satisfied`, `behavior preserv`, `STOP after ONE module`, `## Inputs`, `## Behaviors`, `## Guardrails`); snapshots regenerated
  - **RED**:
    - **GIVEN** the pre-simplification agent prompts
    - **WHEN** `tests/templates/agents-*.test.ts` assertions run against a first simplification attempt
    - **THEN** `PLANNER_PROMPT` still contains `write \`context\.jsonl\``, `REVIEWER_PROMPT` still contains `check every row's \`reason\` is still satisfied`, and `REFACTORER_PROMPT` still contains `behavior preserv` and `STOP after ONE module`
  - **depends_on**: T-20

## Pre-Archive Checklist

<!--
  Verified by the orchestrator after all waves complete.
  These are the gates before review can run.
-->

- [ ] type-check/build passes with no errors
- [ ] test suite passes (per project test command)
- [ ] Every task in every wave is marked `[x]` with a commit hash
- [ ] No `{{` template placeholders remaining in any artifact
- [ ] All wave acceptance criteria confirmed
