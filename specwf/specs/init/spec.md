<!-- BOOTSTRAPPED — extracted from src/commands/specwf-init.ts, src/core/brownfield.ts, src/prompts/init-wizard.ts -->

## Purpose

Initialize or reinitialize a specwf project. Supports greenfield initialization with interactive wizard and brownfield mode for existing codebases.

### Requirement: Initialization Guard

The system SHALL refuse to initialize if `specwf/state.md` already exists, exiting with code 1.

- **Source:** `src/commands/specwf-init.ts:32-35` `initHandler()`  
- **Confidence:** HIGH

#### Scenario: Double init rejected
- **GIVEN** `specwf/state.md` already exists
- **WHEN** `specwf init` is run
- **THEN** the command SHALL print an error and exit with code 1

### Requirement: Profile Selection

The system SHALL accept `--profile` option with values `lite`, `standard` (default), or `strict`.

- **Source:** `src/commands/specwf-init.ts:15`  
- **Confidence:** HIGH

### Requirement: Brownfield Mode

The system SHALL accept `--brownfield` flag to enable brownfield initialization, triggering `detectProjectInfo()` and `runBrownfieldInit()`.

- **Source:** `src/commands/specwf-init.ts:16`, `src/commands/specwf-init.ts:76-79`  
- **Confidence:** HIGH

#### Scenario: Brownfield init with --yes
- **GIVEN** `specwf init --brownfield --yes --profile lite` is invoked
- **WHEN** the handler executes
- **THEN** the system SHALL create the specwf skeleton
- **AND** `detectProjectInfo()` SHALL scan the project root
- **AND** `runBrownfieldInit()` SHALL generate codebase report files in `specwf/codebase/`

### Requirement: Skip Confirmation

The system SHALL accept `--yes` flag to skip the interactive wizard and use defaults (`profile: standard`, `platform: ["omp"]`, `brownfield: false`).

- **Source:** `src/commands/specwf-init.ts:17`, `src/prompts/init-wizard.ts:11-13`  
- **Confidence:** HIGH

### Requirement: Wizard Fallback

The system SHALL gracefully fall back to defaults if `@clack/prompts` is not installed.

- **Source:** `src/prompts/init-wizard.ts:29-32` `runInitWizard()` catch block  
- **Confidence:** HIGH

#### Scenario: Clack not installed
- **GIVEN** `@clack/prompts` is not available
- **WHEN** `runInitWizard({ profile: "standard", yes: false })` is called
- **THEN** defaults SHALL be used with `platform: ["omp"]` and `brownfield: false`

### Requirement: Init Artifacts

The system SHALL create the following during initialization:
- `specwf/` directory skeleton  
- `specwf/project.yml` with version 1, selected profile, and default git config (`branching: "none"`, `create_tag: true`)  
- `specwf/state.md` with `status: "initialized"` and `active_context.step: "init"`  

- **Source:** `src/commands/specwf-init.ts:42-74`  
- **Confidence:** HIGH

### Requirement: Post-Init Platform Generation

The system SHALL automatically generate platform files (commands, agents, skills) after initialization and report the count.

- **Source:** `src/commands/specwf-init.ts:84-91`  
- **Confidence:** HIGH

#### Scenario: Platform generation failure non-fatal
- **GIVEN** platform file generation throws an error
- **WHEN** init handler catches it
- **THEN** a warning SHALL be printed suggesting `specwf update` retry
- **AND** initialization SHALL still complete successfully

### Requirement: Default Init State

The system SHALL initialize `state.md` with:
- `project.name`: derived from the target directory basename  
- `project.status`: `"initialized"`  
- `active_context.type`: `"project"`  
- `active_context.ref`: `null`  
- `active_context.step`: `"init"`  
- `changes`: `[]`  
- `adhoc`: `[]`  

- **Source:** `src/commands/specwf-init.ts:59-73`  
- **Confidence:** HIGH

### Requirement: Brownfield Probes Platform Files

In brownfield mode, the system SHALL NOT generate platform files that could enable conflicting integrations. [INFERENCE — the init code runs `generateAll` in a try-catch block and the brownfield mode creates codebase reports but the domain detection is separate]

- **Source:** `src/commands/specwf-init.ts:76-79`  
- **Confidence:** LOW

### Requirement: Project Info Detection

The system SHALL detect project type, language, framework, test presence, and source directory structure from the project root.

- **Source:** `src/core/brownfield.ts:20-73` `detectProjectInfo()`  
- **Confidence:** HIGH

#### Scenario: Node.js project detected
- **GIVEN** `package.json` exists with `"next": "..."` in dependencies
- **WHEN** `detectProjectInfo()` is called
- **THEN** `info.type` SHALL be `"node"`, `info.framework` SHALL be `"next.js"`, `info.hasPackageJson` SHALL be `true`

#### Scenario: Rust project detected
- **GIVEN** `Cargo.toml` exists at project root
- **WHEN** `detectProjectInfo()` is called
- **THEN** `info.type` SHALL be `"rust"`, `info.language` SHALL be `"rust"`

#### Scenario: Go project detected
- **GIVEN** `go.mod` exists at project root
- **WHEN** `detectProjectInfo()` is called
- **THEN** `info.type` SHALL be `"go"`, `info.language` SHALL be `"go"`

#### Scenario: Test infrastructure detected
- **GIVEN** `vitest.config.ts` or `jest.config.ts` exists
- **WHEN** `detectProjectInfo()` is called
- **THEN** `info.hasTests` SHALL be `true`
