## Purpose
Manage the blueprint state machine — state reading/writing, transition validation, exit-condition checking, and auto-advance routing. State is stored in `blueprint/state.md` with YAML frontmatter.

## Requirements
### Requirement: State File Schema
The system SHALL validate `state.md` frontmatter against a Zod schema.

- **Source:** `src/core/state-file.ts:21-35` `StateFileSchema`  
- **Confidence:** HIGH

The state file SHALL contain:
- `project` — name, status, current_milestone, current_phase  
- `active_context` — type (project|milestone|phase|change|adhoc), ref, step  
- `changes` — array of `{ name, status, depends_on }` for phase changes  
- `adhoc` — array of `{ name, status, depends_on }` for adhoc changes
#### Scenario: Invalid state file throws
- **GIVEN** a `state.md` with malformed frontmatter
- **WHEN** `loadState()` is called
- **THEN** a Zod parse error SHALL be thrown


### Requirement: State File Path
The system SHALL locate `state.md` at `blueprint/state.md`.

- **Source:** `src/core/state-file.ts:38-40` `statePath()`  
- **Confidence:** HIGH

### Requirement: State Transitions
The system SHALL define the legal verification and fix-loopback transitions in the change lifecycle: from a change in the verifying state, the `check` step SHALL be the verification action; when the review is not PASS, the check step SHALL dispatch the fixer sub-agent to repair proposal/design/implementation and then re-review the entire change, rather than routing to standalone `fix`/`replan`/`reapply` command transitions. Each transition MUST record its `from`, `command`, `to`, and `slashCommand` fields.

(was: verification used a `review` step and fix loopbacks routed through standalone `fix`, `replan`, and `reapply` command transitions)

- **Source:** `src/types/state.ts`, `src/commands/bp-state.ts`
- **Confidence:** MEDIUM
#### Scenario: verification transition is check
- **GIVEN** a change status is `applied` (verifying)
- **WHEN** the next transition is resolved
- **THEN** the transition command SHALL be `check`
- **AND** the transition routes the change toward archive once the review passes

#### Scenario: fix loopback is owned by the check step
- **GIVEN** a change whose review verdict is FAIL or NEEDS_REVISION
- **WHEN** the fix loopback transition is resolved
- **THEN** the loopback SHALL route through the check step (dispatch fixer, then full re-review)
- **AND** no standalone `fix` command transition SHALL be used


### Requirement: Transition Validation
The system SHALL provide `canTransition(from, command)` returning `true` only if a matching transition exists in `STATE_TRANSITIONS`.

- **Source:** `src/core/state-machine.ts:10-14` `canTransition()`  
- **Confidence:** HIGH
#### Scenario: Illegal transition rejected
- **GIVEN** current state is `initialized`
- **WHEN** `canTransition("initialized", "archive")` is called
- **THEN** the result SHALL be `false` (archive is not a valid transition from initialized)


### Requirement: Get Next Steps
The system SHALL provide `getNextSteps(from)` returning all transitions available from a given state.

- **Source:** `src/core/state-machine.ts:26-28` `getNextSteps()`  
- **Confidence:** HIGH

### Requirement: State File Persistence
The system SHALL support `loadState()` (read+validate), `saveState()` (frontmatter+body write), and `updateState()` (read+modify+write atomic pattern).

- **Source:** `src/core/state-file.ts:43-67`  
- **Confidence:** HIGH
#### Scenario: Update state pattern
- **GIVEN** the current state has `active_context.type: "project"`
- **WHEN** `updateState(dir, (s) => { s.active_context.type = "phase" })` is called
- **THEN** the state file SHALL be re-read, modified, and written back


### Requirement: Exit Condition Validation
The system SHALL validate that step prerequisites are met before allowing state advance. Exit conditions check for required artifact files and reject template-stub content (files with >3 `{{placeholder}}` patterns).

- **Source:** `src/core/state-validator.ts:30-81` `EXIT_CRITERIA`, `src/core/state-validator.ts:144-173` `validateStepAdvance()`  
- **Confidence:** HIGH
#### Scenario: Grill exit requires requirements.md
- **GIVEN** step is `requirements-defined` at project level
- **WHEN** `validateStepAdvance("project", "requirements-defined", null, cwd)` is called
- **THEN** validation SHALL fail if `requirements.md` contains >3 `{{...}}` placeholders

#### Scenario: Research exit requires summary
- **GIVEN** step is `researched` at project level
- **WHEN** `validateStepAdvance("project", "researched", null, cwd)` is called
- **THEN** validation SHALL fail if `research/summary.md` does not exist

#### Scenario: Discuss exit requires context.md
- **GIVEN** step is `discuss` at phase level
- **WHEN** `validateStepAdvance("phase", "discuss", null, cwd)` is called
- **THEN** validation SHALL fail if `context.md` is a template stub

#### Scenario: Change planning exit checks all changes
- **GIVEN** step is `planning` at change level
- **WHEN** `validateStepAdvance("change", "planning", null, cwd)` is called
- **THEN** the system SHALL scan ALL change directories under `changes/` for template-stub `design.md` or `tasks.md` files

#### Scenario: All exit conditions pass
- **GIVEN** all prerequisite files exist and are not template stubs
- **WHEN** `validateStepAdvance()` is called
- **THEN** `{ valid: true, errors: [] }` SHALL be returned


### Requirement: Auto-Advance Routing
The system SHALL determine the next step based on current `active_context` state, resolving project-level, phase-level, and change-level routes.

- **Source:** `src/core/continue.ts:228-254` `determineFromState()`  
- **Confidence:** HIGH
#### Scenario: Project auto-advance from initialized
- **GIVEN** `active_context.type: "project"`, step `"init"`, project status `"initialized"`
- **WHEN** `determineNextStep()` is called
- **THEN** `nextCommand` SHALL be `"grill"` with `slashCommand: "/blueprint:grill"`

#### Scenario: Change auto-advance from planning
- **GIVEN** `active_context.type: "change"`, change status `"planning"`
- **WHEN** `determineNextStep()` is called
- **THEN** `nextCommand` SHALL be `"apply"` with `needsSubagent: true`

#### Scenario: Adhoc change resolution
- **GIVEN** an adhoc change with status `"proposal"`  
- **WHEN** `determineChangeNextStep(dir, "my-adhoc")` is called
- **THEN** the adhoc SHALL be found in `state.adhoc` and routed to `planning`

#### Scenario: Change not found
- **GIVEN** `changeName` does not exist in state
- **WHEN** `determineChangeNextStep()` is called
- **THEN** `{ error: "change 不存在: ..." }` SHALL be returned with available change names


### Requirement: Step Info Table
The system SHALL maintain a `STEP_INFO` lookup table mapping each workflow command to its description and artifact list for display in `blueprint continue` output.

- **Source:** `src/core/continue.ts:67-153` `STEP_INFO`  
- **Confidence:** HIGH

### Requirement: Change-Verification-Step-Naming
The system SHALL name the change-verification step `check` in state derivation: the `bp state` next action for an applied (implemented, not yet reviewed) change SHALL be `bp check <name>`, while the verification artifact SHALL remain named `review.md`.
#### Scenario: state next action uses check
- **GIVEN** an active change whose artifacts are fully implemented but no `review.md` exists yet
- **WHEN** `deriveState` computes the next action
- **THEN** the next action SHALL be `bp check <name>`
- **AND** it SHALL NOT be `bp review <name>`

#### Scenario: verification artifact stays review.md
- **GIVEN** a change whose `review.md` exists with verdict PASS
- **WHEN** state status is derived from artifacts
- **THEN** the change status is `reviewed`
- **AND** the artifact file is still named `review.md`


