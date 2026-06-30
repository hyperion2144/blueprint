<!-- BOOTSTRAPPED — extracted from src/commands/specwf-archive.ts, src/core/code-extract.ts, src/core/delta-merge.ts -->

## Purpose

Archive completed changes — merge delta-specs into global specs, extract code cognition from git diffs, move change directories to archive, and update state.

### Requirement: Archive Command Input

The system SHALL accept `specwf archive <change-path>` where `change-path` is relative to the project root.

- **Source:** `src/commands/specwf-archive.ts:14-18` `archive` command registration  
- **Confidence:** HIGH

#### Scenario: Change path resolution
- **GIVEN** a change at `specwf/changes/login-flow/`
- **WHEN** `specwf archive specwf/changes/login-flow` is invoked
- **THEN** the change SHALL be looked up at `<cwd>/specwf/changes/login-flow`

### Requirement: Missing Change Error

The system SHALL exit with an error if the specified change directory does not exist.

- **Source:** `src/commands/specwf-archive.ts:25-28`  
- **Confidence:** HIGH

#### Scenario: Change directory missing
- **GIVEN** `specwf/changes/nonexistent/` does not exist
- **WHEN** `specwf archive specwf/changes/nonexistent` is invoked
- **THEN** an error message SHALL be printed and the process exited

### Requirement: Delta-Spec Merging during Archive

The system SHALL merge all delta-specs from `changes/<name>/specs/` into the global `specwf/specs/` directory during archive.

- **Source:** `src/commands/specwf-archive.ts:105-130` `mergeDeltaSpecs()`  
- **Confidence:** HIGH

#### Scenario: Delta spec creates new global spec
- **GIVEN** `changes/login-flow/specs/auth/spec.md` exists but `specwf/specs/auth/spec.md` does not
- **WHEN** archive handler executes delta merge
- **THEN** the delta spec SHALL be written as `specwf/specs/auth/spec.md`

#### Scenario: Delta spec merges into existing global spec
- **GIVEN** both delta and global specs exist for domain `auth`
- **WHEN** archive handler executes delta merge
- **THEN** `mergeDeltaSpec()` SHALL be called with the live spec content and delta content

#### Scenario: No delta specs
- **GIVEN** change has no `specs/` directory
- **WHEN** archive handler executes
- **THEN** delta-spec merging SHALL be skipped

### Requirement: Change Summary Warning

The system SHALL warn if `change-summary.md` does not exist in the change directory, but SHALL NOT block archiving.

- **Source:** `src/commands/specwf-archive.ts:38-41`  
- **Confidence:** HIGH

#### Scenario: Missing summary
- **GIVEN** `change-summary.md` does not exist in change directory
- **WHEN** archive handler executes
- **THEN** a warning SHALL be printed suggesting `specwf template change-summary`
- **AND** archiving SHALL continue

### Requirement: Code Cognition Extraction

The system SHALL extract behavior and constraint keywords from git diffs and write them into spec files as `AUTO-EXTRACTED` sections.

- **Source:** `src/commands/specwf-archive.ts:44-53`, `src/core/code-extract.ts:136-155` `writeExtractionToSpec()`  
- **Confidence:** MEDIUM

#### Scenario: Successful extraction
- **GIVEN** git diff is available and delta-specs define domains
- **WHEN** archive handler executes code extraction
- **THEN** extracted behaviors and constraints SHALL be written to `specwf/specs/<domain>/spec.md`
- **AND** the extraction SHALL be wrapped in `<!-- AUTO-EXTRACTED -->` markers

#### Scenario: No git diff available
- **GIVEN** `extractFromGitDiff()` returns `{ available: false }`
- **WHEN** archive handler processes extraction
- **THEN** no auto-extracted sections SHALL be written

#### Scenario: No extractions found
- **GIVEN** `extractFromGitDiff()` returns `{ extractions: [] }`
- **WHEN** archive handler processes extraction
- **THEN** no auto-extracted sections SHALL be written

### Requirement: Archive Directory Move

The system SHALL move the change directory from `changes/<name>/` to `archive/changes/<name>-<timestamp>/` using `archiveChangeDir()`.

- **Source:** `src/commands/specwf-archive.ts:56-57`  
- **Confidence:** HIGH

#### Scenario: Change archived with timestamp
- **GIVEN** change `specwf/changes/login-flow/`
- **WHEN** `archiveChangeDir(dir, fullChangePath)` is called
- **THEN** the directory SHALL be moved to `specwf/archive/changes/login-flow-<timestamp>/`

### Requirement: Git RM of Archived Path

The system SHALL attempt `git rm -r` of the old change path, treating failures as non-critical.

- **Source:** `src/commands/specwf-archive.ts:60-64`  
- **Confidence:** HIGH

#### Scenario: Git rm fails gracefully
- **GIVEN** the change directory is not tracked by git
- **WHEN** `git rm -r` fails
- **THEN** the error SHALL be caught and archiving SHALL continue

### Requirement: State Update on Archive

The system SHALL update `state.md` after archiving:
- Move the change from active changes to a completed record  
- Transition the change status from `archiving` to `archived`  

- **Source:** `src/commands/specwf-archive.ts:67-98`  
- **Confidence:** HIGH

#### Scenario: Phase change archived
- **GIVEN** a phase change `login-flow` with status `archiving`
- **WHEN** archive handler updates state
- **THEN** the change SHALL be moved to `archived` status in state

#### Scenario: State update failure non-critical
- **GIVEN** state update throws an error
- **WHEN** archive handler catches it
- **THEN** the error SHALL be swallowed and the message "归档完成。" SHALL still be printed

### Requirement: State Transition via Continue

The system SHALL use `specwf continue` to advance state from `change-archiving` to `change-archived` via the `archive-done` command.

- **Source:** `src/types/state.ts:68` `{ from: 'change-archiving', command: 'archive-done', to: 'change-archived' }`  
- **Confidence:** HIGH
