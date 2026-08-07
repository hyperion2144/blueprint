<!-- BOOTSTRAPPED — extracted from src/commands/bp-finish.ts, src/core/delta-merge.ts, src/core/file-tree.ts -->

## Purpose

Archive completed changes — merge delta specs into the global specs, move change directories to the archive, and update the roadmap. The archive is executed by `bp finish <change-name>` after the `bp check` review gate passes.

### Requirement: Archive Command Input

The system SHALL accept `bp finish <change-name>` where `change-name` is the name of an active change under `bp/changes/`.

- **Source:** `src/commands/bp-finish.ts` `finish` command registration
- **Confidence:** HIGH

#### Scenario: Change name resolution
- **GIVEN** a change at `bp/changes/login-flow/`
- **WHEN** `bp finish login-flow` is invoked
- **THEN** the change SHALL be looked up at `<bpDir>/changes/login-flow`

### Requirement: Missing Change Error

The system SHALL exit with an error if the specified change directory does not exist.

- **Source:** `src/commands/bp-finish.ts`
- **Confidence:** HIGH

#### Scenario: Change directory missing
- **GIVEN** `bp/changes/nonexistent/` does not exist
- **WHEN** `bp finish nonexistent` is invoked
- **THEN** an error message SHALL be printed and the process exits non-zero

### Requirement: Review Gate on Archive

The system SHALL refuse to archive a change whose `review.md` is missing, has a non-PASS verdict, or has unresolved `- [ ]` issues, and SHALL route the user to `bp check` to fix and re-review.

- **Source:** `src/commands/bp-finish.ts` review verification
- **Confidence:** HIGH

#### Scenario: Missing review blocks archive
- **GIVEN** a change with no `review.md`
- **WHEN** `bp finish <change-name>` is invoked
- **THEN** the command SHALL exit non-zero and print `Run "bp check" first.`

#### Scenario: Review not passed
- **GIVEN** a change whose `review.md` verdict is FAIL or NEEDS_REVISION
- **WHEN** `bp finish <change-name>` is invoked
- **THEN** the command SHALL exit non-zero and print `Fix issues first: bp check <change-name>`

#### Scenario: Unresolved issues block archive
- **GIVEN** a change whose `review.md` has open `- [ ] R/Q/G/D` issues
- **WHEN** `bp finish <change-name>` is invoked
- **THEN** the command SHALL exit non-zero and print `Fix issues first: bp check <change-name>`

### Requirement: Delta-Spec Merging during Archive

The system SHALL merge all delta specs from `bp/changes/<name>/specs/` into the global `bp/specs/` directory during `bp finish`, applying ADDED/MODIFIED/REMOVED requirement changes via `mergeDeltaSpec()`.

- **Source:** `src/commands/bp-finish.ts`, `src/core/delta-merge.ts`
- **Confidence:** HIGH

#### Scenario: Delta spec creates new global spec
- **GIVEN** `bp/changes/login-flow/specs/auth/spec.md` exists but `bp/specs/auth/spec.md` does not
- **WHEN** `bp finish login-flow` executes the delta merge
- **THEN** the delta spec SHALL be written as `bp/specs/auth/spec.md`

#### Scenario: Delta spec merges into existing global spec
- **GIVEN** both delta and global specs exist for domain `auth`
- **WHEN** `bp finish login-flow` executes the delta merge
- **THEN** `mergeDeltaSpec()` SHALL be called with the live spec content and the delta content
- **AND** ADDED requirements SHALL be appended, MODIFIED requirements SHALL replace their global counterpart, and REMOVED requirements SHALL be deleted

#### Scenario: Merge conflict blocks archive
- **GIVEN** the delta spec conflicts with the global spec (for example a MODIFIED requirement absent from the global spec)
- **WHEN** `mergeDeltaSpec()` returns a conflict
- **THEN** `bp finish` SHALL print the conflicting sections and exit non-zero

#### Scenario: No delta specs
- **GIVEN** a change has no `specs/` directory
- **WHEN** `bp finish` executes
- **THEN** delta-spec merging SHALL be skipped

### Requirement: Archive Directory Move

The system SHALL move the change directory from `bp/changes/<name>/` to `bp/changes/archive/<date>-<name>/` using `archiveChangeDir()`.

- **Source:** `src/core/file-tree.ts` `archiveChangeDir()`
- **Confidence:** HIGH

#### Scenario: Change archived with date
- **GIVEN** change `bp/changes/login-flow/`
- **WHEN** `archiveChangeDir(bpDir, 'login-flow')` is called
- **THEN** the directory SHALL be copied to `bp/changes/archive/<date>-login-flow/`
- **AND** the source `bp/changes/login-flow/` SHALL be removed

### Requirement: State Update on Archive

The system SHALL treat the archive as the state update — state is derived from artifacts, so no `state.md` is written; `bp finish` moves the change directory to the archive, updates `bp/roadmap.md` when applicable, and prints `Archived <change-name>` plus the merged-spec count and archive path.

- **Source:** `src/commands/bp-finish.ts` output summary
- **Confidence:** HIGH

#### Scenario: Successful archive output
- **GIVEN** `bp finish login-flow` archives successfully
- **WHEN** the command completes
- **THEN** stdout SHALL contain `Archived login-flow`, `- N delta spec(s) merged into bp/specs/`, and `- Change moved to bp/changes/archive/<date>-login-flow/`

### Requirement: Roadmap Update on Archive

The system SHALL update `bp/roadmap.md` when the archived change's proposal has a `## Roadmap Reference` section: mark the change `- [x]`, update the containing phase's `- **Changes**: X/Y` counter, and mark the phase COMPLETED / milestone SHIPPED when complete.

- **Source:** `src/commands/bp-finish.ts` roadmap update
- **Confidence:** HIGH

#### Scenario: Phase change marked archived
- **GIVEN** `bp/roadmap.md` lists the change as `- [ ] login-flow` inside a phase with a changes counter
- **WHEN** `bp finish login-flow` updates the roadmap
- **THEN** the change SHALL be marked `- [x] login-flow (archived <date>)`
- **AND** the phase changes counter SHALL be incremented

#### Scenario: No roadmap reference
- **GIVEN** the proposal has no `## Roadmap Reference` section
- **WHEN** `bp finish` executes
- **THEN** the roadmap SHALL NOT be updated
