# Delta Spec: platform-gen

<!--
  Behavioral contract for this change. Produced by the planner agent.
  Adds a `pi` platform (Pi Coding Agent) generating `.pi/skills/`, `.pi/agents/`,
  and `.pi/extensions/bp/index.ts`, plus `bp update` stale cleanup for `.pi/`.

  On archive:
  - ADDED -> appended to bp/specs/platform-gen/spec.md
-->

> Change: add-pi-platform | Domain: platform-gen

## ADDED Requirements

### Requirement: pi-platform-support

The system SHALL register `pi` as a first-class platform and, when `platform` contains `pi`, SHALL generate a complete project-local output set under `.pi/` comprising 11 workflow-step skills, 6 sub-agent definitions, and one bp extension file. The `pi` provider SHALL NOT emit slash-command files (pi uses Agent Skills, not commands), and its display name SHALL identify the Pi Coding Agent.

#### Scenario: Generate pi platform files

- **GIVEN** a valid project configuration with `platform: [pi]`
- **WHEN** `bp update` runs
- **THEN** exactly 11 skill files under `.pi/skills/`, 6 agent definition files under `.pi/agents/`, and 1 extension file at `.pi/extensions/bp/index.ts` SHALL be generated
- **AND** no command files (e.g. `.pi/commands/`) SHALL be emitted

#### Scenario: Preserve deterministic output

- **GIVEN** the same ProjectConfig and workflow sources
- **WHEN** pi generation runs twice
- **THEN** every generated path and content byte SHALL be identical

#### Scenario: Pi coexists with other platforms

- **GIVEN** a project configuration with `platform: [codex, pi]`
- **WHEN** `bp update` runs
- **THEN** the codex output set (`.agents/skills/`, `.codex/`) SHALL be generated unchanged
- **AND** the pi output set (`.pi/`) SHALL be generated alongside it

### Requirement: pi-skills-generation

The system SHALL emit 11 skill files at `.pi/skills/bp-<step>/SKILL.md`, one per workflow step (init, roadmap, propose, plan, apply, check, archive, continue, ff, loop, refactor). Each skill SHALL carry Agent-Skills-standard frontmatter with `name: bp:<step>` and a one-line `description`, SHALL NOT include an `argument-hint` field, and SHALL contain a non-empty workflow body sourced from the shared workflow registry.

#### Scenario: Generate all eleven pi skills

- **GIVEN** a project configuration with `platform: [pi]`
- **WHEN** `bp update` runs
- **THEN** `.pi/skills/bp-init/SKILL.md`, `.pi/skills/bp-roadmap/SKILL.md`, `.pi/skills/bp-propose/SKILL.md`, `.pi/skills/bp-plan/SKILL.md`, `.pi/skills/bp-apply/SKILL.md`, `.pi/skills/bp-check/SKILL.md`, `.pi/skills/bp-archive/SKILL.md`, `.pi/skills/bp-continue/SKILL.md`, `.pi/skills/bp-ff/SKILL.md`, `.pi/skills/bp-loop/SKILL.md`, and `.pi/skills/bp-refactor/SKILL.md` SHALL all exist

#### Scenario: Skill frontmatter and body

- **GIVEN** a generated `.pi/skills/bp-plan/SKILL.md`
- **WHEN** the file is parsed
- **THEN** its frontmatter contains `name: bp:plan` and a non-empty `description` and no `argument-hint` field
- **AND** its body is non-empty and matches the workflow registry content for the plan step

#### Scenario: Deterministic skill output

- **GIVEN** the same ProjectConfig and workflow sources
- **WHEN** pi skill generation runs twice
- **THEN** every generated `.pi/skills/bp-<step>/SKILL.md` content byte SHALL be identical

### Requirement: pi-agents-generation

The system SHALL emit 6 agent definition files at `.pi/agents/bp-<role>.md` for the roles planner, executor, reviewer, codebase-scanner, refactorer, and fixer. Each file SHALL contain YAML frontmatter with `name: bp-<role>` and a one-line `description`, SHALL list tools as a simple YAML array only when the role defines tools, SHALL include a `model` field only when the project configuration assigns a model to that role, SHALL NOT include OMP-specific frontmatter fields, and SHALL have a body equal to the role's system prompt.

#### Scenario: Generate all six pi agents

- **GIVEN** a project configuration with `platform: [pi]`
- **WHEN** `bp update` runs
- **THEN** `.pi/agents/bp-planner.md`, `.pi/agents/bp-executor.md`, `.pi/agents/bp-reviewer.md`, `.pi/agents/bp-codebase-scanner.md`, `.pi/agents/bp-refactorer.md`, and `.pi/agents/bp-fixer.md` SHALL all exist

#### Scenario: Agent frontmatter is generic

- **GIVEN** a generated `.pi/agents/bp-refactorer.md`
- **WHEN** the file is parsed as frontmatter + body
- **THEN** the frontmatter contains `name: bp-refactorer` and a string `description`
- **AND** the frontmatter does NOT contain `modelRoles`, `thinkingLevel`, or other OMP-specific fields

#### Scenario: Agent body embeds the role prompt

- **GIVEN** a generated `.pi/agents/bp-refactorer.md`
- **WHEN** the file body is inspected
- **THEN** the body is non-empty and contains the refactorer role's prompt marker text (behavior-preservation mandate)
- **AND** a project configuration with `models.refactorer` set causes the emitted frontmatter to include that `model` value

### Requirement: pi-extension-generation

The system SHALL emit the bp extension at `.pi/extensions/bp/index.ts` whose content is a single self-contained TypeScript source string, and SHALL produce byte-identical output across invocations with the same configuration.

#### Scenario: Extension file is emitted

- **GIVEN** a project configuration with `platform: [pi]`
- **WHEN** `bp update` runs
- **THEN** `.pi/extensions/bp/index.ts` SHALL exist
- **AND** its content SHALL implement the pi extension contract (context handlers + `bp_subagent` tool registration)

#### Scenario: Extension bytes are deterministic

- **GIVEN** the same ProjectConfig
- **WHEN** extension generation runs twice
- **THEN** the two `content` values SHALL be byte-identical
- **AND** the content SHALL not depend on clock, randomness, or generation-time environment values

### Requirement: pi-extension-context-contract

The generated pi extension SHALL port the OMP context contract onto pi's extension events: (1) at `session_start`, SHALL append a `bp-context` custom message whose body is a compact context block, augmented per detected agent type; (2) at `before_agent_start`, SHALL inject a `bp-workflow-state` message at most once per session; (3) at `context`, SHALL re-inject a `bp-workflow-state` message into the message list whenever no message with that custom type is present. Agent type SHALL be detected from the effective system prompt text.

#### Scenario: Planner session receives roadmap augmentation

- **GIVEN** a configured project whose active change has a milestone and phase, and a session whose system prompt contains the planner role marker
- **WHEN** the `session_start` handler runs
- **THEN** a `bp-context` custom message is appended whose body contains a `<bp-context>` block and a `## Roadmap State` section listing the milestone and phase

#### Scenario: Executor and fixer sessions receive context rows

- **GIVEN** a configured project with an active change whose `context.jsonl` contains a row tagged `guard-rail`
- **WHEN** the `session_start` handler runs for a session whose system prompt contains the executor or fixer role marker
- **THEN** the emitted body inlines every context.jsonl row as `file: <path> | reason: <reason>`
- **AND** the `guard-rail` row is prefixed with `> GUARD-RAIL:`

#### Scenario: Reviewer session receives invariants and acceptance text

- **GIVEN** a configured project with an active change whose `context.jsonl` and `tasks.md` exist
- **WHEN** the `session_start` handler runs for a session whose system prompt contains the reviewer role marker
- **THEN** the emitted body contains a `## Invariants` section listing each row's reason as a bullet
- **AND** it appends the active change's `tasks.md` content verbatim under a `## tasks.md acceptance` section

#### Scenario: Refactorer session receives refactor targets

- **GIVEN** a configured project whose `bp/.refactor-report.md` contains a `## Summary` block
- **WHEN** the `session_start` handler runs for a session whose system prompt contains the refactorer role marker
- **THEN** the emitted body contains a `## Refactor Targets` section whose text equals the report's summary block

#### Scenario: Unknown agent type receives paths-only block

- **GIVEN** a configured project and a session whose system prompt contains none of the role markers
- **WHEN** the `session_start` handler runs
- **THEN** the emitted body is the paths-only compact context block with no augmentation

#### Scenario: Workflow state is injected once per session

- **GIVEN** a configured project
- **WHEN** the `before_agent_start` handler runs twice in the same session
- **THEN** the first invocation returns a `bp-workflow-state` message containing a state summary
- **AND** the second invocation returns no message

#### Scenario: Workflow state is re-injected after compaction

- **GIVEN** a configured project and a `context` event whose message list contains no `bp-workflow-state` custom message
- **WHEN** the `context` handler runs
- **THEN** a `bp-workflow-state` message is pushed into the returned message list
- **AND** when the message list already contains one, the handler returns the list unchanged

### Requirement: pi-extension-subagent-tool

The generated pi extension SHALL register a `bp_subagent` tool that discovers agent definitions from the project's `.pi/agents/` directory (frontmatter name/description/tools plus body as the system prompt, invalid files skipped) and spawns isolated `pi` subprocesses in JSON mode, either for a single agent or for multiple agents in parallel with concurrency capped at 4. The tool SHALL return the subagents' assistant output as text.

#### Scenario: Single-agent delegation

- **GIVEN** a project with `.pi/agents/bp-planner.md` and a configured pi session
- **WHEN** the `bp_subagent` tool is called with `{ agent: "bp-planner", task: "plan change X" }`
- **THEN** a `pi --mode json -p --no-session` subprocess is spawned whose arguments inherit the agent's model, tools, and system prompt
- **AND** the tool result contains the subprocess's assistant output text

#### Scenario: Parallel delegation

- **GIVEN** a project with several agent files under `.pi/agents/`
- **WHEN** the `bp_subagent` tool is called with a `tasks` array containing more than 4 entries
- **THEN** the tasks run concurrently with at most 4 in flight
- **AND** the tool result contains each task's assistant output

#### Scenario: Unknown agent is rejected

- **GIVEN** a project whose `.pi/agents/` contains no agent named `bogus`
- **WHEN** the `bp_subagent` tool is called with `{ agent: "bogus", task: "..." }`
- **THEN** the tool returns an error result naming the unknown agent and listing the available agent names
- **AND** no subprocess is spawned

#### Scenario: Invalid parameter combinations are rejected

- **GIVEN** a configured pi session
- **WHEN** the `bp_subagent` tool is called with neither a single `agent`/`task` pair nor a `tasks` array, or with both
- **THEN** the tool returns an error result listing the available agent names
- **AND** no subprocess is spawned

### Requirement: pi-extension-bypass-and-config-skip

When `BP_HOOKS=0` or `BP_DISABLE_HOOKS=1` is set in the environment, every pi extension handler (`session_start`, `before_agent_start`, `context`) SHALL return immediately without appending or returning any message. When `bp/config.yaml` is absent at the working directory, every handler SHALL behave identically.

#### Scenario: Environment bypass short-circuits handlers

- **GIVEN** `BP_HOOKS=0` in the environment and a configured project
- **WHEN** any of the three handlers runs
- **THEN** no message is appended and no message is returned
- **AND** no bp runtime data is read

#### Scenario: Missing config skips handlers

- **GIVEN** a working directory without `bp/config.yaml`
- **WHEN** any of the three handlers runs
- **THEN** no message is appended and no message is returned

### Requirement: pi-update-cleanup

The system SHALL remove stale bp-generated `.pi/` artifacts during `bp update` when they are no longer in the current generation set: `.pi/skills/bp-<step>/` directories whose step is not generated, `.pi/agents/bp-*.md` files not generated, and the `.pi/extensions/bp/` directory when its `index.ts` is not generated. The system SHALL NOT delete user-owned files under `.pi/`.

#### Scenario: Remove stale generated pi entries

- **GIVEN** a project configured without `pi` whose `.pi/` contains stale `.pi/skills/bp-archive-old/SKILL.md`, `.pi/agents/bp-fixer.md`, and `.pi/extensions/bp/index.ts`
- **WHEN** `bp update` runs
- **THEN** those three stale bp-owned entries SHALL be removed
- **AND** the update SHALL log a `✓ Removed stale:` line for each

#### Scenario: Preserve user-owned pi files

- **GIVEN** a project whose `.pi/` also contains `.pi/settings.json` and `.pi/skills/user-skill/SKILL.md`
- **WHEN** `bp update` runs
- **THEN** the user-owned `.pi/settings.json` and `.pi/skills/user-skill/` SHALL remain unchanged

#### Scenario: Configured pi output is never pruned

- **GIVEN** a project configured with `platform: [pi]`
- **WHEN** `bp update` runs
- **THEN** all 18 generated `.pi/` files SHALL be present after the run
- **AND** no generated `.pi/` entry is removed
