# Delta Spec: templates

> Change: workflow-reform | Domain: templates

## ADDED Requirements

### Requirement: Check-Step-Rename

The system SHALL expose the change-verification lifecycle step as `bp check <name>`: the command registration, the workflow template body, the registry key `check`, the template module `check.ts`, the platform step files, the `continue` routing, the schema action step, and the context/state step name SHALL all use `check`, while the review artifact file SHALL remain named `review.md` with every existing reference to that artifact unchanged.

#### Scenario: registry exposes check and not review

- **GIVEN** the workflow registry
- **WHEN** `WORKFLOW_REGISTRY['check']` and `WORKFLOW_REGISTRY['review']` are read
- **THEN** `check` resolves to the check template getters
- **AND** `review` is not a registry key

#### Scenario: check command prints the check instructions

- **GIVEN** an initialized bp project with a fully-implemented change
- **WHEN** `bp check <name>` runs
- **THEN** stdout contains the check workflow instructions (`## Input`, `## Steps`, `## Output`, `## Guardrails`)
- **AND** `bp review <name>` exits non-zero as an unknown command

#### Scenario: review artifact file name is preserved

- **GIVEN** the check template body
- **WHEN** the body is scanned for artifact references
- **THEN** it references `review.md`
- **AND** no instruction renames the artifact file to `check.md`

### Requirement: Fixer-Agent-Role

The system SHALL provide a `bp-fixer` sub-agent role registered under `AGENT_PROMPTS['fixer']`, emitted as `bp-fixer.md` by every platform agents generator, and recognized by the OMP Extension `detectAgentType` as `'fixer'`; the system SHALL NOT provide a `bp fix` CLI command and SHALL NOT register a `fix` workflow step.

#### Scenario: fixer role is a sub-agent only

- **GIVEN** the agent prompt registry
- **WHEN** `AGENT_PROMPTS['fixer']` is read
- **THEN** it is a non-empty English string containing `## Role`, `## Inputs`, `## Behaviors`, `## Guardrails`
- **AND** no `bp fix` command is registered and no `fix` key exists in `WORKFLOW_REGISTRY`

#### Scenario: platform agent files include bp-fixer

- **GIVEN** a ProjectConfig with `platform: [omp, claude-code, agent, opencode]`
- **WHEN** each platform's agent generator runs
- **THEN** each produced file set includes `bp-fixer.md`

### Requirement: Reviewer-Full-Review

The reviewer sub-agent prompt SHALL NOT contain a fix-mode section and SHALL instruct a full triple review (spec + quality + goal) of the entire change on every run.

#### Scenario: reviewer prompt has no fix mode

- **GIVEN** the `REVIEWER_PROMPT`
- **WHEN** it is scanned for fix-mode artifacts
- **THEN** it contains no `## Fix Mode` header, no `--fix` substring, and no `[~]` three-state marker

#### Scenario: reviewer still re-validates context rows

- **GIVEN** the `REVIEWER_PROMPT`
- **WHEN** its context re-validation section is inspected
- **THEN** it still instructs checking every context.jsonl row's `reason` is still satisfied

### Requirement: Check-Step-Full-Rereview

The check step SHALL, after a non-PASS reviewer verdict, dispatch the `bp-fixer` sub-agent to repair the change's proposal, design, and implementation from the reviewer report, and then dispatch the reviewer for a full re-review of the entire change (all three gates) — never a fix-mode diff-only check.

#### Scenario: non-PASS verdict routes to fixer then full re-review

- **GIVEN** the check workflow instructions
- **WHEN** they are inspected for the non-PASS routing path
- **THEN** they instruct dispatching `bp dispatch fixer --change <name>` for a non-PASS verdict
- **AND** they instruct re-dispatching the reviewer for a full re-review of all three gates

#### Scenario: continue routes non-PASS verdicts to check

- **GIVEN** a change whose review.md verdict is FAIL with open issues
- **WHEN** `bp continue` determines the next step
- **THEN** the next step command contains `check`
- **AND** it does not route to `plan --fix` or `apply --fix`

### Requirement: Finish-Command

The system SHALL expose the archive executor as `bp finish <name>`; the `bp finalize` command SHALL NOT be registered.

#### Scenario: finish archives end-to-end

- **GIVEN** a change with review.md verdict PASS
- **WHEN** `bp finish <name>` runs
- **THEN** the change is moved to `bp/changes/archive/<date>-<name>/` and delta specs are merged
- **AND** `bp finalize` is not a registered command

#### Scenario: finish error messages reference check

- **GIVEN** a change with review.md missing
- **WHEN** `bp finish <name>` runs
- **THEN** the error message instructs running `bp check` first
- **AND** the command exits with code 1

### Requirement: Archive-Check-Step

The archive workflow template SHALL include an orchestrated archive-check step that scans the change's proposal, design, and implementation, adjusts the change's delta specs (`specs/<domain>/spec.md`) by ADDing or MODIFYing requirements so the archived specs match reality, and only then runs `bp finish <name>`.

#### Scenario: archive-check step precedes finish

- **GIVEN** the archive workflow template instructions
- **WHEN** they are parsed for step order
- **THEN** a step instructs scanning proposal/design/implementation and ADDing/MODIFYing the change's delta-spec requirements
- **AND** that step appears before the step running `bp finish $1`

#### Scenario: archive template no longer names finalize

- **GIVEN** the archive workflow template instructions
- **WHEN** scanned
- **THEN** they contain no `bp finalize` substring

### Requirement: Propose-Grilling-First

The propose step SHALL grill the user first (one question at a time, recommended answer provided, resolving every decision-tree branch) and SHALL write the detailed proposal from the grilling output, fetching the proposal template after grilling completes; trivial/light changes SHALL retain a skip path for the grilling.

#### Scenario: grilling precedes template fetch

- **GIVEN** the propose workflow template
- **WHEN** its steps are parsed
- **THEN** a grilling step (containing `one question at a time` and `recommended answer`) appears before the step running `bp template proposal --stdout`
- **AND** the template notes grilling may be skipped for trivial/light changes

### Requirement: Design-Item-Contract-Fields

The design template SHALL require every design item (DS-N) to carry explicit Requirements, Constraints, and Acceptance Criteria fields, and the plan step's Step-4 quality review SHALL verify those fields are present for every DS-N.

#### Scenario: design template includes the three fields

- **GIVEN** the design artifact template
- **WHEN** `bp template design --stdout` runs
- **THEN** the DS-N block contains `**Requirements**:`, `**Constraints**:`, and `**Acceptance Criteria**:`

#### Scenario: plan step verifies the fields

- **GIVEN** the plan workflow template
- **WHEN** its Step-4 quality-review dimension list is inspected
- **THEN** the implementability dimension asks whether every DS-N carries Requirements, Constraints, and Acceptance Criteria

### Requirement: Roadmap-Lightweight-Grilling

The roadmap step SHALL conduct a lightweight grilling that determines project direction and agrees milestones/phases with the user (one question at a time, recommended answer provided), and SHALL defer detailed requirement capture (features, edge cases, failure modes) to each change's propose step.

#### Scenario: roadmap grilling is lightweight

- **GIVEN** the roadmap workflow template
- **WHEN** its Step 1 is inspected
- **THEN** it instructs a lightweight grilling covering project direction and milestone/phase agreement
- **AND** it explicitly defers detailed requirements to per-change propose steps

### Requirement: Prompt-Simplification

Every workflow template body and every agent prompt SHALL be simplified so each instruction states one thing plainly without boilerplate, repetition, or redundant hedging, while preserving the Input/Steps/Output/Guardrails structure (for templates) and all required guardrails.

#### Scenario: simplification preserves asserted structure

- **GIVEN** any workflow template after simplification
- **WHEN** parsed for section headers
- **THEN** headers `## Input`, `## Steps`, `## Output`, `## Guardrails` are all present in order
- **AND** the template still contains the shared context-injection reminder before `## Input`

#### Scenario: simplification preserves asserted keywords

- **GIVEN** the simplified agent prompts
- **WHEN** the agent-prompt tests run
- **THEN** `PLANNER_PROMPT` still instructs writing `context.jsonl`
- **AND** `REFACTORER_PROMPT` still contains `behavior preserv` and `STOP after ONE module`

## MODIFIED Requirements

### Requirement: Refactor-Workflow-Template

The system SHALL export `getRefactorSkillTemplate()` and `getRefactorCommandTemplate()` from `src/templates/workflows/refactor.ts`, both returning a non-empty `SkillTemplate` / `CommandTemplate` whose `instructions` / `content` are the same string. `WORKFLOW_REGISTRY['refactor']` SHALL be a typed entry whose `skill()` and `command()` resolve to these two functions. The `instructions` string SHALL be English-only prose containing the section headers `## Input`, `## Steps`, `## Output`, `## Guardrails` in that order, and SHALL describe the five orchestrator steps: (1) run `bp refactor analyze <target>`, (2) display the report and obtain explicit human confirmation, (3) dispatch `bp dispatch refactorer --target <module>` per affected module, (4) refactorer applies behavior-preserving consolidation + spec sync, (5) summarize the diff.
(was: the requirement referenced the lifecycle command `bp review`; it now references `bp check` since the verification step was renamed)

#### Scenario: dual-export template exists and is registered

- **GIVEN** the `src/templates/workflows/refactor.ts` module
- **WHEN** `getRefactorSkillTemplate()` and `getRefactorCommandTemplate()` are imported and called
- **THEN** both return objects whose `instructions` / `content` field is identical
- **AND** the string contains `## Input`, `## Steps`, `## Output`, `## Guardrails`
- **AND** `WORKFLOW_REGISTRY['refactor'].command().content === getRefactorCommandTemplate().content`.

#### Scenario: instructions forbid lifecycle integration

- **GIVEN** the refactor `instructions` body
- **WHEN** parsed for forbidden patterns
- **THEN** the body MUST NOT mention lifecycle artifact paths such as `bp/changes/<name>/proposal.md`, `bp/changes/<name>/design.md`, `bp/changes/<name>/tasks.md`, or `bp/changes/<name>/review.md`, nor the lifecycle commands `bp plan`, `bp apply`, `bp check`, or `bp archive` (refactor is a standalone auxiliary step; the shared `CONTEXT_JSONL_REMINDER`'s `bp/changes/<name>/context.jsonl` schema pointer is not a lifecycle artifact)
- **AND** the body MUST instruct the orchestrator to pause for explicit human confirmation before dispatching the refactorer.
