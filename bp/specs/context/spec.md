<!-- BOOTSTRAPPED — extracted from src/core/spec-injector.ts, src/commands/blueprint-context.ts, src/commands/blueprint-update.ts -->

## Purpose

Inject spec, convention, and artifact context into agent sessions. Generate platform integration files (commands, agents, skills, hooks) from TypeScript templates. Enable agents to access relevant project state without reading the full file tree.

### Requirement: Context Output Structure

The system SHALL produce a `ContextResult` containing: step name, scope (type+ref), specs array, conventions array, change artifacts array, and requirements array.

- **Source:** `src/core/spec-injector.ts:19-26` `ContextResult`  
- **Confidence:** HIGH

### Requirement: Step-Scoped Context

The system SHALL inject different file sets based on step classification:

- **Project steps** (`init`, `grill`, `research`, `roadmap`): ALL specs + conventions + requirements  
- **Phase steps** (`discuss`, `research-phase`, `split`): related specs + conventions + requirements  
- **Change steps** (`plan`, `apply`, `review`, `verify`, `archive`): related specs + conventions + requirements + change artifacts  

- **Source:** `src/core/spec-injector.ts:29-31`, `src/core/spec-injector.ts:46-81` `generateContext()`  
- **Confidence:** HIGH

#### Scenario: Project step gets all specs
- **GIVEN** step is `grill` (project step)
- **WHEN** `generateContext(dir, "grill")` is called
- **THEN** `result.specs` SHALL contain all spec files from `blueprint/specs/`
- **AND** `result.changeArtifacts` SHALL be empty

#### Scenario: Change step gets change artifacts
- **GIVEN** step is `apply` (change step) and state has active changes
- **WHEN** `generateContext(dir, "apply")` is called
- **THEN** `result.changeArtifacts` SHALL contain proposal, design, tasks, and delta-specs for the active change

### Requirement: Content Capping

The system SHALL cap file content at 8KB to avoid context bloat. Content exceeding 8KB SHALL be truncated with `... [truncated]` marker.

- **Source:** `src/core/spec-injector.ts:85-92` `readContent()`  
- **Confidence:** HIGH

#### Scenario: Large file truncated
- **GIVEN** a spec file with 20KB content
- **WHEN** `readContent()` is called
- **THEN** only the first 8192 bytes SHALL be returned followed by `\n... [truncated]`

#### Scenario: Small file passed through
- **GIVEN** a spec file with 3KB content
- **WHEN** `readContent()` is called
- **THEN** the full content SHALL be returned

### Requirement: Conventions Always Injected

The system SHALL always include all convention files in context output, regardless of step type.

- **Source:** `src/core/spec-injector.ts:60` `result.conventions = getAllConventions(...)`  
- **Confidence:** HIGH

### Requirement: Requirements Always Injected

The system SHALL always include `requirements.md` if it exists, regardless of step type.

- **Source:** `src/core/spec-injector.ts:63-70`  
- **Confidence:** HIGH

#### Scenario: Requirements file absent
- **GIVEN** `blueprint/requirements.md` does not exist
- **WHEN** `generateContext()` is called
- **THEN** no requirements entry SHALL be added

### Requirement: Context CLI Output

The `blueprint context <step>` command SHALL output JSON containing project info, current state, pending changes, specs, conventions, artifacts, and requirements.

- **Source:** `src/commands/blueprint-context.ts:16-46` `contextHandler()`  
- **Confidence:** HIGH

#### Scenario: Context JSON output
- **GIVEN** a project with pending changes
- **WHEN** `blueprint context plan` is invoked
- **THEN** JSON with `project`, `status`, `milestone`, `phase`, `context`, `pending`, `specs`, `conventions`, `artifacts`, `requirements` SHALL be printed

### Requirement: Platform File Generation

The system SHALL generate platform files from TypeScript templates:

- `.omp/commands/blueprint-<step>.md` — 16 slash commands  
- `.omp/agents/blueprint-<role>.md` — 8 agent definitions  
- `.omp/skills/blueprint-<step>/SKILL.md` — 16 skill workflow guides  
- `.omp/hooks/pre/blueprint.ts` — OMP hook for auto-injection  

- **Source:** `src/generators/index.ts`, `src/generators/omp-commands.ts`, `src/generators/omp-agents.ts`, `src/generators/skills.ts`  
- **Confidence:** HIGH

#### Scenario: Skill generation from workflow registry
- **GIVEN** a project config with profile `standard`
- **WHEN** `generateAll(config)` is called
- **THEN** 16 skill files SHALL be generated with frontmatter containing `name`, `description`, and `hide: false`

#### Scenario: Agent model resolution
- **GIVEN** profile is `strict`
- **WHEN** `resolveAgentModel("research", config)` is called
- **THEN** `"slow:high"` SHALL be returned

### Requirement: Update Command

The `blueprint update` command SHALL regenerate all platform files from the current configuration, including deploying the OMP hook to `.omp/hooks/pre/blueprint.ts`.

- **Source:** `src/commands/blueprint-update.ts:81-97` `updateHandler()`  
- **Confidence:** HIGH

#### Scenario: Update with hook deployment
- **GIVEN** `blueprint update --dir blueprint` is invoked
- **WHEN** the handler executes
- **THEN** all generated files SHALL be written
- **AND** `.omp/hooks/pre/blueprint.ts` SHALL be created/updated

### Requirement: Agent Tool Sets

The system SHALL define agent tool sets by role, with the executor having the widest tool set (including `edit`, `ast_grep`, `ast_edit`).

- **Source:** `src/generators/omp-agents.ts:30-87` `AGENT_DEFS`  
- **Confidence:** HIGH

#### Scenario: Executor tool set
- **GIVEN** the executor agent definition
- **WHEN** agent file is generated
- **THEN** tools SHALL include `read`, `edit`, `write`, `bash`, `grep`, `glob`, `lsp`, `ast_grep`, `ast_edit`

#### Scenario: Researcher tool set
- **GIVEN** the researcher agent definition
- **WHEN** agent file is generated
- **THEN** tools SHALL include `read`, `grep`, `glob`, `lsp`, `write`, `bash` (read-heavy, no edit)

### Requirement: Dispatch Format

The `blueprint dispatch <role>` command SHALL output platform-specific sub-agent dispatch instructions, with `--change` option to pass a change name.

- **Source:** `src/commands/blueprint-dispatch.ts`  
- **Confidence:** HIGH

#### Scenario: Dispatch with change
- **GIVEN** `blueprint dispatch executor --change login-flow` is invoked
- **WHEN** the handler executes
- **THEN** output SHALL include `agent: blueprint-executor` and `Change: login-flow`
