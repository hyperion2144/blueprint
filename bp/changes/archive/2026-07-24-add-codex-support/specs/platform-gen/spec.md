> Change: add-codex-support | Domain: platform-gen

## ADDED Requirements

### Requirement: codex-platform-support
The system SHALL register `codex` as a first-class platform and, when selected, generate ten project-scoped Skills under `.agents/skills/bp-<step>/SKILL.md` and a `.codex/hooks.json` configuration for the Codex CLI v0.140+ contract.

#### Scenario: Generate Codex platform files
- **GIVEN** a valid project configuration with `platform: [codex]`
- **WHEN** `bp update` runs
- **THEN** ten Skill files SHALL be generated for the defined workflow steps
- **AND** each Skill SHALL use `name: bp:<step>` frontmatter without `argument-hint`
- **AND** `.codex/hooks.json` SHALL be generated

#### Scenario: Preserve deterministic output
- **GIVEN** the same ProjectConfig and workflow sources
- **WHEN** Codex generation runs twice
- **THEN** every generated path and content byte SHALL be identical

#### Scenario: Unknown configuration is rejected
- **GIVEN** `platform` contains an id other than a registered platform
- **WHEN** generation runs
- **THEN** the command SHALL exit with code 1 and report the unknown platform
- **AND** SHALL NOT write a partial Codex output set

### Requirement: codex-hook-runtime
The system SHALL wire SessionStart, SessionStop, UserPromptSubmit, PreToolUse, and PostToolUse to a generated handler that emits bp context/workflow-state payloads according to the existing OMP runtime contract.

#### Scenario: Five lifecycle events are wired
- **GIVEN** generated `.codex/hooks.json`
- **WHEN** the JSON is parsed
- **THEN** all five event keys SHALL be present
- **AND** PreToolUse and PostToolUse SHALL match `Bash`
- **AND** each command SHALL invoke the generated handler with its event argument

#### Scenario: Handler injects workflow context
- **GIVEN** a configured project and a SessionStart or tool lifecycle event
- **WHEN** Codex invokes the handler
- **THEN** the handler SHALL emit a bp-context or bp-workflow-state-equivalent payload
- **AND** the payload SHALL include the current workflow state available to bp

#### Scenario: Hooks are safely bypassed
- **GIVEN** `BP_HOOKS=0`, `BP_DISABLE_HOOKS=1`, or no `bp/config.yaml`
- **WHEN** any generated handler event is invoked
- **THEN** the handler SHALL exit successfully without emitting a payload
- **AND** SHALL not call the bp runtime

### Requirement: codex-platform-selection
The system SHALL offer Codex CLI in the interactive init platform picker and accept `codex` in generated project configuration.

#### Scenario: Select Codex in init
- **GIVEN** the interactive init wizard is displayed
- **WHEN** platform options are listed
- **THEN** a `Codex CLI` option SHALL be available
- **AND** its description SHALL identify generated Skills and hooks

#### Scenario: Non-interactive defaults remain compatible
- **GIVEN** `bp init --yes` or an unavailable prompt dependency
- **WHEN** initialization completes
- **THEN** the default platform SHALL remain `omp`
- **AND** Codex SHALL not be selected implicitly

### Requirement: codex-update-cleanup
The system SHALL remove stale generated Codex hooks and `bp-*` Skill directories during update without deleting unrelated Codex files.

#### Scenario: Remove stale generated entries
- **GIVEN** `.codex/hooks.json` and `.agents/skills/bp-archive-old/` are stale
- **WHEN** `bp update` runs with Codex selected
- **THEN** those stale generated entries SHALL be removed

#### Scenario: Preserve unrelated files
- **GIVEN** `.codex/foo.txt` and `.agents/skills/third-party/` exist
- **WHEN** `bp update` runs
- **THEN** both unrelated files SHALL remain unchanged

### Requirement: codex-dispatch-isolation
The system SHALL emit Codex executor dispatch instructions that use orchestrator-managed `git worktree add` isolation and the configured `task` dispatch tool.

#### Scenario: Dispatch Codex executor
- **GIVEN** Codex is the configured platform and an executor dispatch is requested
- **WHEN** `bp dispatch executor --change <name>` runs
- **THEN** output SHALL declare isolation type `none`
- **AND** output SHALL instruct the orchestrator to create a worktree with `git worktree add`
- **AND** output SHALL identify `task` as the dispatch tool

#### Scenario: Dispatch failure is explicit
- **GIVEN** the requested change does not exist or the role is unsupported
- **WHEN** dispatch is invoked
- **THEN** the command SHALL exit with code 1 and print a clean error

## MODIFIED Requirements

### SHALL support three platforms: omp, claude-code, agent
The system SHALL support four platforms: `omp`, `claude-code`, `agent`, and `codex`, while preserving existing generation behavior for the original three platforms.
(was: The system SHALL support three platforms: omp, claude-code, agent.)

#### Scenario: Generate Codex alongside existing platforms
- **GIVEN** `platform: [omp, claude-code, agent, codex]`
- **WHEN** `bp update` runs
- **THEN** all four platform output families SHALL be generated
- **AND** existing OMP, Claude Code, and Agent outputs SHALL remain unchanged

#### Scenario: Single Codex platform
- **GIVEN** `platform: [codex]`
- **WHEN** `bp update` runs
- **THEN** only Codex-owned files SHALL be generated

## REMOVED Requirements

<!-- No requirements are removed by this change. -->
