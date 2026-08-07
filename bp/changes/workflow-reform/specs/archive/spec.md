# Delta Spec: archive

> Change: workflow-reform | Domain: archive

## ADDED Requirements

### Requirement: Finish-Command

The system SHALL expose the archive executor as `bp finish <change-name>`; the `bp finalize` command SHALL NOT be registered.

#### Scenario: finish command archives a change

- **GIVEN** a change at `bp/changes/login-flow/` whose review.md verdict is PASS
- **WHEN** `bp finish login-flow` is invoked
- **THEN** the change SHALL be merged into `bp/specs/` and moved to `bp/changes/archive/<date>-login-flow/`
- **AND** the command exits with code 0

#### Scenario: finalize is not a command

- **GIVEN** an initialized bp project
- **WHEN** `bp finalize login-flow` is invoked
- **THEN** the command SHALL be unknown (exits non-zero)

### Requirement: Archive-Check-Step

The archive workflow SHALL include an orchestrated archive-check step that scans the change's proposal, design, and implementation, adjusts the change's delta specs (`specs/<domain>/spec.md`) by ADDing or MODIFYing requirements so the archived specs match what was actually implemented, and only then runs `bp finish`.

#### Scenario: delta specs are reconciled before finishing

- **GIVEN** a change whose implementation implements a behavior not yet required by its delta spec
- **WHEN** the archive workflow executes the archive-check step followed by `bp finish`
- **THEN** the delta spec is MODIFIED to require the implemented behavior
- **AND** the merged global spec contains the added requirement

#### Scenario: archive check writes only to change delta specs

- **GIVEN** the archive-check step in the archive template
- **WHEN** its write scope is inspected
- **THEN** it writes only to `specs/<domain>/spec.md` files inside the change directory
- **AND** it never edits `bp/specs/<domain>/spec.md` directly

## MODIFIED Requirements

### Requirement: Archive Command Input

The system SHALL accept `bp finish <change-name>` where `change-name` is the name of an active change under `bp/changes/`.

(was: `blueprint archive <change-path>` where `change-path` was relative to the project root)

- **Source:** `src/commands/bp-finish.ts`
- **Confidence:** HIGH

#### Scenario: change name resolution

- **GIVEN** a change at `bp/changes/login-flow/`
- **WHEN** `bp finish login-flow` is invoked
- **THEN** the change SHALL be looked up at `<bpDir>/changes/login-flow`

### Requirement: Missing Change Error

The system SHALL exit with an error if the specified change directory does not exist.

- **Source:** `src/commands/bp-finish.ts`
- **Confidence:** HIGH

#### Scenario: change directory missing

- **GIVEN** `bp/changes/nonexistent/` does not exist
- **WHEN** `bp finish nonexistent` is invoked
- **THEN** an error message SHALL be printed and the process exits with a non-zero code
