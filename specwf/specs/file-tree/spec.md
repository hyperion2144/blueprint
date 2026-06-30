<!-- BOOTSTRAPPED — extracted from src/core/file-tree.ts, src/commands/specwf-archive.ts, src/commands/specwf-change.ts, src/commands/specwf-list.ts, src/commands/specwf-template.ts -->

## Purpose

Manage the specwf directory structure — creating, listing, and archiving milestones, phases, and changes. Provide artifact template generation and change lifecycle management.

### Requirement: Directory Skeleton

The system SHALL create the specwf directory skeleton during initialization with these directories: `specs/`, `conventions/`, `changes/`, `archive/`, `research/`, `templates/`, `milestones/`.

- **Source:** `src/core/file-tree.ts:10-18` `SPECWF_DIRS`  
- **Confidence:** HIGH

#### Scenario: Init creates all directories
- **GIVEN** a fresh project directory
- **WHEN** `createSpecwfStructure("/project/specwf")` is called
- **THEN** all 7 directories SHALL be created

### Requirement: Initialization Check

The system SHALL provide `isInitialized(specwfDir)` returning `true` only if `state.md` exists in the specwf directory.

- **Source:** `src/core/file-tree.ts:29-32` `isInitialized()`  
- **Confidence:** HIGH

#### Scenario: Already initialized
- **GIVEN** `specwf/state.md` exists
- **WHEN** `isInitialized()` is called
- **THEN** `true` SHALL be returned

#### Scenario: Not initialized
- **GIVEN** `specwf/` directory does not exist
- **WHEN** `isInitialized()` is called
- **THEN** `false` SHALL be returned

### Requirement: Entity Directory Creation

The system SHALL provide functions to create milestone, phase, change, and adhoc change directories with the correct hierarchy.

- **Source:** `src/core/file-tree.ts:34-79`  
- **Confidence:** HIGH

#### Scenario: Create milestone directory
- **GIVEN** a specwf directory
- **WHEN** `createMilestoneDir(dir, "m1")` is called
- **THEN** `specwf/milestones/m1/` SHALL be created and its path returned

#### Scenario: Create phase directory
- **GIVEN** milestone `m1` exists
- **WHEN** `createPhaseDir(dir, "m1", "auth")` is called
- **THEN** `specwf/milestones/m1/auth/` SHALL be created

#### Scenario: Create change directory
- **GIVEN** phase `auth` exists under milestone `m1`
- **WHEN** `createChangeDir(dir, "m1", "auth", "login-flow")` is called
- **THEN** `specwf/changes/login-flow/` SHALL be created

#### Scenario: Create adhoc change directory
- **GIVEN** a specwf directory
- **WHEN** `createAdhocChangeDir(dir, "hotfix")` is called
- **THEN** `specwf/changes/hotfix/` SHALL be created

### Requirement: Change Initialization

When creating a new change via `specwf change new <name>`:
- The fast path (default) SHALL create `proposal.md`, `design.md`, `tasks.md`, and `specs/<name>/spec.md`  
- The full cycle path (`--full`) SHALL create only `proposal.md`  
- The change SHALL be registered in `state.md`  
- Fast path sets status to `planning`; full cycle sets status to `proposal`  

- **Source:** `src/commands/specwf-change.ts:25-81` `newChange()`  
- **Confidence:** HIGH

#### Scenario: Fast path change creation
- **GIVEN** `specwf change new feature-x` is invoked
- **WHEN** the handler executes
- **THEN** `changes/feature-x/` SHALL contain `proposal.md`, `design.md`, `tasks.md`, and `specs/feature-x/spec.md`
- **AND** `state.adhoc` SHALL include `{ name: "feature-x", status: "planning", depends_on: [] }`

#### Scenario: Full cycle change creation
- **GIVEN** `specwf change new feature-y --full` is invoked
- **WHEN** the handler executes
- **THEN** `changes/feature-y/` SHALL contain only `proposal.md`
- **AND** `state.adhoc` SHALL include `{ name: "feature-y", status: "proposal", depends_on: [] }`

### Requirement: Archive Directory Move

The system SHALL archive a change by moving it from `changes/<name>/` to `archive/changes/<name>-<timestamp>/`.

- **Source:** `src/core/file-tree.ts:82-98` `archiveChangeDir()`  
- **Confidence:** HIGH

#### Scenario: Change archived with timestamp
- **GIVEN** change directory `changes/login-flow/`
- **WHEN** `archiveChangeDir(dir, "changes/login-flow/")` is called
- **THEN** the directory SHALL be moved to `archive/changes/login-flow-<ISO timestamp>/`
- **AND** the original path SHALL no longer exist

### Requirement: Milestone Archive

The system SHALL archive a milestone by moving it from `milestones/<id>/` to `archive/milestones/<id>-<timestamp>/`.

- **Source:** `src/core/file-tree.ts:101-118` `archiveMilestoneDir()`  
- **Confidence:** HIGH

#### Scenario: Milestone archived
- **GIVEN** milestone directory `milestones/m1/`
- **WHEN** `archiveMilestoneDir(dir, "m1")` is called
- **THEN** the directory SHALL be moved to `archive/milestones/m1-<ISO timestamp>/`

### Requirement: Directory Listing

The system SHALL provide list functions for milestones, phases, changes, adhoc changes, and archived changes that return string arrays of directory basenames.

- **Source:** `src/core/file-tree.ts:124-175`  
- **Confidence:** HIGH

#### Scenario: List milestones
- **GIVEN** directories `milestones/m1/` and `milestones/m2/` exist
- **WHEN** `listMilestones(dir)` is called
- **THEN** `["m1", "m2"]` SHALL be returned

#### Scenario: Empty directory listing
- **GIVEN** no adhoc changes exist
- **WHEN** `listAdhocChanges(dir)` is called
- **THEN** `[]` SHALL be returned

### Requirement: Artifact Template Generation

The system SHALL generate artifact files from a TypeScript template registry. Template IDs include: `proposal`, `design`, `tasks`, `context`, `research`, `summary`, `verification`, `spec-review`, `quality-review`, `goal-review`, `change-summary`, `codebase-stack`, `codebase-architecture`, `codebase-conventions`, `codebase-pitfalls`, `phase-research`.

- **Source:** `src/commands/specwf-template.ts`, `src/templates/artifacts/index.ts`  
- **Confidence:** HIGH

#### Scenario: Generate proposal template
- **GIVEN** `specwf template proposal --name my-change` is invoked
- **WHEN** the handler executes
- **THEN** `specwf/changes/my-change/proposal.md` SHALL be created with `{{name}}` replaced by `my-change`

#### Scenario: Unknown template type
- **GIVEN** `specwf template nonexistent` is invoked
- **WHEN** the handler executes
- **THEN** the CLI SHALL exit with code 1 and list available types

### Requirement: Change Listing

The `specwf list` command SHALL display the hierarchy: milestones → phases → changes, plus adhoc changes, and optionally archived items.

- **Source:** `src/commands/specwf-list.ts`  
- **Confidence:** HIGH

#### Scenario: List with items
- **GIVEN** milestones, phases, and changes exist
- **WHEN** `specwf list` is invoked
- **THEN** the tree SHALL be printed to stdout

#### Scenario: Empty list
- **GIVEN** no milestones, phases, changes, or adhoc changes exist
- **WHEN** `specwf list` is invoked
- **THEN** `(无条目)` SHALL be printed

#### Scenario: List with archive
- **GIVEN** archived changes exist
- **WHEN** `specwf list --all` is invoked
- **THEN** archived changes SHALL be listed under "归档:" section
