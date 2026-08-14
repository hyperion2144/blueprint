# Delta Spec: platform-gen

<!--
  Behavioral contract for platform generation changes. Produced by the planner agent.
  Modifies count pins that the design track invalidates (11->16 skills, 6->7 agents).

  On archive:
  - MODIFIED -> replaces the existing requirement in bp/specs/platform-gen/spec.md
-->

> Change: add-design-workflow | Domain: platform-gen

## MODIFIED Requirements

### Requirement: pi-platform-support

The system SHALL register `pi` as a first-class platform and, when `platform` contains `pi`, SHALL generate a complete project-local output set under `.pi/` comprising 16 workflow-step skills, 7 sub-agent definitions, and one bp extension file. The `pi` provider SHALL NOT emit slash-command files (pi uses Agent Skills, not commands), and its display name SHALL identify the Pi Coding Agent.
(was: the requirement stated 11 workflow-step skills and 6 sub-agent definitions; the design track adds five steps and the designer role)

#### Scenario: Generate pi platform files

- **GIVEN** a valid project configuration with `platform: [pi]`
- **WHEN** `bp update` runs
- **THEN** exactly 16 skill files under `.pi/skills/`, 7 agent definition files under `.pi/agents/`, and 1 extension file at `.pi/extensions/bp/index.ts` SHALL be generated
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

The system SHALL emit 16 skill files at `.pi/skills/bp-<step>/SKILL.md`, one per workflow step (init, roadmap, propose, plan, apply, check, archive, continue, ff, loop, refactor, design, design-html, design-review, design-shotgun, plan-design-review). Each skill SHALL carry Agent-Skills-standard frontmatter with `name: bp:<step>` and a one-line `description`, SHALL NOT include an `argument-hint` field, SHALL NOT contain the two-character sequence colon+space in its `description`, and SHALL contain a non-empty workflow body sourced from the shared workflow registry.
(was: the requirement listed eleven steps and did not state the colon+space prohibition)

#### Scenario: Generate all sixteen pi skills

- **GIVEN** a project configuration with `platform: [pi]`
- **WHEN** `bp update` runs
- **THEN** `.pi/skills/bp-init/SKILL.md`, `.pi/skills/bp-roadmap/SKILL.md`, `.pi/skills/bp-propose/SKILL.md`, `.pi/skills/bp-plan/SKILL.md`, `.pi/skills/bp-apply/SKILL.md`, `.pi/skills/bp-check/SKILL.md`, `.pi/skills/bp-archive/SKILL.md`, `.pi/skills/bp-continue/SKILL.md`, `.pi/skills/bp-ff/SKILL.md`, `.pi/skills/bp-loop/SKILL.md`, `.pi/skills/bp-refactor/SKILL.md`, `.pi/skills/bp-design/SKILL.md`, `.pi/skills/bp-design-html/SKILL.md`, `.pi/skills/bp-design-review/SKILL.md`, `.pi/skills/bp-design-shotgun/SKILL.md`, and `.pi/skills/bp-plan-design-review/SKILL.md` SHALL all exist

#### Scenario: Skill frontmatter and body

- **GIVEN** a generated `.pi/skills/bp-design/SKILL.md`
- **WHEN** the file is parsed
- **THEN** its frontmatter contains `name: bp:design` and a non-empty `description` with no `:` sequence and no `argument-hint` field
- **AND** its body is non-empty and matches the workflow registry content for the design step

### Requirement: pi-agents-generation

The system SHALL emit 7 agent definition files at `.pi/agents/bp-<role>.md` for the roles planner, executor, reviewer, codebase-scanner, refactorer, fixer, and designer. Each file SHALL contain YAML frontmatter with `name: bp-<role>` and a one-line `description`, SHALL list tools as a simple YAML array only when the role defines tools, SHALL include a `model` field only when the project configuration assigns a model to that role, SHALL NOT include OMP-specific frontmatter fields, and SHALL have a body equal to the role's system prompt.
(was: the requirement listed six roles without designer)

#### Scenario: Generate all seven pi agents

- **GIVEN** a project configuration with `platform: [pi]`
- **WHEN** `bp update` runs
- **THEN** `.pi/agents/bp-planner.md`, `.pi/agents/bp-executor.md`, `.pi/agents/bp-reviewer.md`, `.pi/agents/bp-codebase-scanner.md`, `.pi/agents/bp-refactorer.md`, `.pi/agents/bp-fixer.md`, and `.pi/agents/bp-designer.md` SHALL all exist

#### Scenario: Designer agent model tier flows from config

- **GIVEN** a generated `.pi/agents/bp-designer.md` and a project configuration with `models.designer` set
- **WHEN** the file is parsed as frontmatter + body
- **THEN** the frontmatter contains `name: bp-designer` and the configured `model` value
- **AND** the body is non-empty and contains the designer role's marker text

### Requirement: codex-platform-support

The system SHALL register `codex` as a first-class platform and, when selected, generate sixteen project-scoped Skills under `.agents/skills/bp-<step>/SKILL.md` and a `.codex/hooks.json` configuration for the Codex CLI v0.140+ contract.
(was: the requirement stated ten Skills; the count is aligned with the current registry size including the design track)

#### Scenario: Generate Codex platform files

- **GIVEN** a valid project configuration with `platform: [codex]`
- **WHEN** `bp update` runs
- **THEN** sixteen Skill files SHALL be generated for the defined workflow steps
- **AND** each Skill SHALL use `name: bp:<step>` frontmatter without `argument-hint`
- **AND** `.codex/hooks.json` SHALL be generated

#### Scenario: Design steps are generated for Codex

- **GIVEN** a valid project configuration with `platform: [codex]`
- **WHEN** `bp update` runs
- **THEN** `.agents/skills/bp-design/SKILL.md`, `.agents/skills/bp-design-html/SKILL.md`, `.agents/skills/bp-design-review/SKILL.md`, `.agents/skills/bp-design-shotgun/SKILL.md`, and `.agents/skills/bp-plan-design-review/SKILL.md` SHALL all exist
- **AND** each body is byte-identical to the corresponding workflow registry instructions

#### Scenario: Preserve deterministic output

- **GIVEN** the same ProjectConfig and workflow sources
- **WHEN** Codex generation runs twice
- **THEN** every generated path and content byte SHALL be identical

#### Scenario: Unknown configuration is rejected

- **GIVEN** `platform` contains an id other than a registered platform
- **WHEN** generation runs
- **THEN** the command SHALL exit with code 1 and report the unknown platform
- **AND** SHALL NOT write a partial Codex output set
