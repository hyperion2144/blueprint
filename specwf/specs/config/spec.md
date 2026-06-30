<!-- BOOTSTRAPPED — extracted from src/core/config.ts, src/types/config.ts, src/commands/specwf-config.ts -->

## Purpose

Manage the `specwf/project.yml` configuration file — the single source of truth for project profile, workflow toggles, model mappings, and platform settings. Configuration is read/written via YAML with comment preservation.

### Requirement: Config File Path

The system SHALL locate `project.yml` at `specwf/project.yml` relative to the specwf directory.

- **Source:** `src/core/config.ts:44-46` `configPath()` joins `specwfDir` + `project.yml`  
- **Confidence:** HIGH

#### Scenario: Config path resolution
- **GIVEN** a specwf directory at `/project/specwf`
- **WHEN** `configPath("/project/specwf")` is called
- **THEN** the path SHALL be `/project/specwf/project.yml`

### Requirement: Config Schema Validation

The system SHALL validate `project.yml` against a Zod schema on load. The schema MUST enforce `version` as a number, `profile` as one of `lite | standard | strict`, and `platform` as an array of strings.

- **Source:** `src/core/config.ts:12-41` `ProjectConfigSchema`  
- **Confidence:** HIGH

#### Scenario: Invalid config throws
- **GIVEN** a `project.yml` with `profile: "invalid"`
- **WHEN** `loadConfig()` is called
- **THEN** a Zod parse error SHALL be thrown

#### Scenario: Valid config parsed
- **GIVEN** a valid `project.yml` with `version: 1, profile: "standard", platform: ["omp"]`
- **WHEN** `loadConfig()` is called
- **THEN** a valid `ProjectConfig` object SHALL be returned with all defaults populated

### Requirement: Config Fields

The system SHALL support the following config fields:

- **version** (`number`, REQUIRED) — config schema version  
- **platform** (`string[]`, REQUIRED) — target platforms (e.g. `["omp"]`)  
- **profile** (`'lite' | 'standard' | 'strict'`, REQUIRED) — workflow strictness  
- **context** (`string`, REQUIRED) — project context description  
- **workflow** (`WorkflowToggles`, OPTIONAL, default `{}`) — feature toggles  
- **review** (`ReviewConfig`, OPTIONAL, default `{}`) — review gate settings  
- **change** (`ChangeConfig`, OPTIONAL, default `{}`) — parallel strategy  
- **git** (`GitConfig`, OPTIONAL, default `{}`) — branching strategy  
- **conventions** (`{ inject: boolean }`, OPTIONAL, default `{ inject: true }`) — convention injection  
- **models** (`ModelMap`, OPTIONAL, default `{}`) — user model overrides  

- **Source:** `src/core/config.ts:12-41`, `src/types/config.ts:56-69`  
- **Confidence:** HIGH

### Requirement: Config Save Preserves Comments

The system SHALL preserve YAML comments when writing `project.yml` by using the `yaml.Document` API.

- **Source:** `src/core/config.ts:56-74` `saveConfig()` uses `readYamlDoc()` / `writeYamlDoc()`  
- **Confidence:** HIGH

#### Scenario: Round-trip preserves comments
- **GIVEN** a `project.yml` with comments
- **WHEN** `updateConfig(dir, updater)` is called to modify a single field
- **THEN** the updated file SHALL retain all existing comments

### Requirement: Atomic Config Update

The system SHALL provide `updateConfig()` that loads, applies an updater function, and saves in one call.

- **Source:** `src/core/config.ts:77-81` `updateConfig()`  
- **Confidence:** HIGH

#### Scenario: Dot-path key update
- **GIVEN** `specwf config set workflow.research false` is invoked
- **WHEN** the CLI handler resolves `workflow.research` via dot-path traversal
- **THEN** `config.workflow.research` SHALL be set to `false` and saved

### Requirement: Profile Model Mapping

The system SHALL resolve agent models by merging profile defaults with user overrides. Profile defaults are defined in `PROFILE_MODEL_MAP` for 6 roles: `research`, `plan`, `execute`, `review`, `verify`, `archive`.

- **Source:** `src/types/config.ts:72-97` `PROFILE_MODEL_MAP`, `src/core/config.ts:84-88` `resolveModels()`  
- **Confidence:** HIGH

#### Scenario: Lite profile default models
- **GIVEN** profile is `lite`
- **WHEN** `resolveModels()` is called with no user overrides
- **THEN** all roles SHALL map to `default` except archive which SHALL map to `smol`

#### Scenario: User model override
- **GIVEN** profile is `standard` and `config.models = { research: "custom-model" }`
- **WHEN** `resolveModels()` is called
- **THEN** `research` SHALL be `"custom-model"` and other roles SHALL use profile defaults

### Requirement: Typed Value Parsing

The CLI `config set` command SHALL parse string values into typed values: `"true"/"false"` → boolean, digits-only → number, `"null"` → null, otherwise → string.

- **Source:** `src/commands/specwf-config.ts:59-65` `parseTypedValue()`  
- **Confidence:** HIGH
