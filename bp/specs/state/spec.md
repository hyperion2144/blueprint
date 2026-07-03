<!-- BOOTSTRAPPED — extracted from src/types/state.ts, src/core/state-machine.ts, src/core/state-file.ts, src/core/state-validator.ts, src/core/continue.ts, src/commands/blueprint-continue.ts -->

## Purpose

Manage the blueprint state machine — state reading/writing, transition validation, exit-condition checking, and auto-advance routing. State is stored in `blueprint/state.md` with YAML frontmatter.

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

The system SHALL define all legal state transitions in `STATE_TRANSITIONS`. Every transition MUST have `from`, `command`, `to`, and `slashCommand` fields.

- **Source:** `src/types/state.ts:52-87` `STATE_TRANSITIONS`  
- **Confidence:** HIGH

#### Scenario: Project workflow path
- **GIVEN** project status is `initialized`
- **WHEN** the `grill` command is executed
- **THEN** the transition to `requirements-defined` SHALL be legal

#### Scenario: Phase change workflow path
- **GIVEN** a change status is `change-verifying`
- **WHEN** the `archive` command is executed
- **THEN** the transition to `change-archiving` SHALL be legal

#### Scenario: Replan loopback
- **GIVEN** a change status is `change-verifying`
- **WHEN** `replan` command is used
- **THEN** the transition to `change-planning` SHALL be legal

#### Scenario: Reapply loopback
- **GIVEN** a change status is `change-verifying`
- **WHEN** `reapply` command is used  
- **THEN** the transition to `change-applying` SHALL be legal

#### Scenario: Fix loopback
- **GIVEN** a change status is `change-reviewing`
- **WHEN** `fix` command is used
- **THEN** the transition to `change-applying` SHALL be legal

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
