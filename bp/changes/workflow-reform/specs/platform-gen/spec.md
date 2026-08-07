# Delta Spec: platform-gen

> Change: workflow-reform | Domain: platform-gen

## ADDED Requirements

### Requirement: Fixer-Platform-Generation

The system SHALL emit a `bp-fixer.md` agent file from `AGENT_PROMPTS['fixer']` on every agent platform generator (omp, claude-code, agent, opencode), and the OMP Extension runtime SHALL recognize the `fixer` sub-agent type.

#### Scenario: every agent generator emits bp-fixer.md

- **GIVEN** a ProjectConfig with `platform: [omp, claude-code, agent, opencode]`
- **WHEN** each platform's agent generator runs
- **THEN** each produced file set includes `bp-fixer.md`
- **AND** the file body embeds `AGENT_PROMPTS['fixer']`

#### Scenario: OMP detectAgentType recognizes fixer

- **GIVEN** an `ExtensionContext` whose `agentTemplate === 'bp-fixer'`
- **WHEN** `detectAgentType(ctx)` runs
- **THEN** the return value equals `'fixer'`
- **AND** the `AgentType` union includes `'fixer'`

#### Scenario: fixer session augments context rows

- **GIVEN** an initialized bp project with a change whose `context.jsonl` exists
- **WHEN** the OMP `session_start` handler runs for a `bp-fixer` session
- **THEN** the emitted `<bp-context>` block inlines the change's context.jsonl rows (path + reason)
- **AND** rows with `tag: guard-rail` are prefixed with `> GUARD-RAIL:`

### Requirement: Fixer-Dispatch-Isolation

The `bp dispatch fixer` subcommand SHALL emit executor-style isolation for the configured platform, since the fixer edits source code and change artifacts.

#### Scenario: dispatch fixer uses executor isolation

- **GIVEN** a project configured with `platform: [omp, claude-code]`
- **WHEN** `bp dispatch fixer --change <name>` runs
- **THEN** stdout contains an `### Isolation` section for each platform
- **AND** the isolation type matches the executor's isolation type for each platform

## MODIFIED Requirements

### Requirement: OMP Extension Sub-Agent Discrimination

The `session_start` handler SHALL detect the OMP sub-agent type from `ctx.agentTemplate`:

- When the template name contains `planner`, the emitted `<bp-context>` block SHALL be augmented with a `## Roadmap State` section listing the current milestone, current phase, and the next step name.
- When the template name contains `executor`, the emitted body SHALL inline every row of `bp/changes/<active>/context.jsonl` (path, reason, phase, tag); rows whose `tag` equals `guard-rail` SHALL be prefixed with `> GUARD-RAIL: `.
- When the template name contains `reviewer`, the emitted body SHALL list each context.jsonl row's `reason` as a bullet under `## Invariants` and SHALL append the active change's `tasks.md` acceptance-criteria text verbatim.
- When the template name contains `fixer`, the emitted body SHALL inline every row of `bp/changes/<active>/context.jsonl` (path, reason, phase, tag) exactly as the executor case; rows whose `tag` equals `guard-rail` SHALL be prefixed with `> GUARD-RAIL: `.
- When the template name matches none of the above, the emitted body SHALL be the paths-only `<bp-context>` block with no augmentation.

(was: the requirement did not describe a `fixer` case)

#### Scenario: fixer template produces the executor-style inline rows

- **GIVEN** an `ExtensionContext` whose `agentTemplate === 'bp-fixer'` and an active change with a context.jsonl containing a `guard-rail` row
- **WHEN** the `session_start` handler emits the context block
- **THEN** the emitted body contains the row's file path and reason
- **AND** the `guard-rail` row is prefixed with `> GUARD-RAIL:`
