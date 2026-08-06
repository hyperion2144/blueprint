# Delta Spec: templates

> Change: refactor-command | Domain: templates

## ADDED Requirements

### Requirement: Refactor-Workflow-Template

The system SHALL export `getRefactorSkillTemplate()` and `getRefactorCommandTemplate()` from `src/templates/workflows/refactor.ts`, both returning a non-empty `SkillTemplate` / `CommandTemplate` whose `instructions` / `content` are the same string. `WORKFLOW_REGISTRY['refactor']` SHALL be a typed entry whose `skill()` and `command()` resolve to these two functions. The `instructions` string SHALL be English-only prose containing the section headers `## Input`, `## Steps`, `## Output`, `## Guardrails` in that order, and SHALL describe the five orchestrator steps: (1) run `bp refactor analyze <target>`, (2) display the report and obtain explicit human confirmation, (3) dispatch `bp dispatch refactorer --target <module>` per affected module, (4) refactorer applies behavior-preserving consolidation + spec sync, (5) summarize the diff.

#### Scenario: dual-export template exists and is registered

- **GIVEN** the new `src/templates/workflows/refactor.ts` module
- **WHEN** `getRefactorSkillTemplate()` and `getRefactorCommandTemplate()` are imported and called
- **THEN** both return objects whose `instructions` / `content` field is identical
- **AND** the string contains `## Input`, `## Steps`, `## Output`, `## Guardrails`
- **AND** `WORKFLOW_REGISTRY['refactor'].command().content === getRefactorCommandTemplate().content`.

#### Scenario: registry resolution surfaces the refactor body

- **GIVEN** an initialized bp project
- **WHEN** `getWorkflowInstructions('refactor', bpDir)` runs
- **THEN** the returned string equals `WORKFLOW_REGISTRY['refactor'].command().content`
- **AND** it contains a `### Step 1:` instructing the orchestrator to run `bp refactor analyze`.

#### Scenario: instructions forbid lifecycle integration

- **GIVEN** the refactor `instructions` body
- **WHEN** parsed for forbidden patterns
- **THEN** the body MUST NOT mention `bp/changes/`, `bp plan`, `bp apply`, `bp review`, or `bp archive` (refactor is a standalone auxiliary step)
- **AND** the body MUST instruct the orchestrator to pause for explicit human confirmation before dispatching the refactorer.

### Requirement: Refactorer-Agent-Prompt

The system SHALL export `REFACTORER_PROMPT` from `src/templates/agents/index.ts` and register it under `AGENT_PROMPTS['refactorer']`. The prompt SHALL be a non-empty English-only string containing the sections `## Role`, `## Inputs`, `## Behaviors`, `## Guardrails`, and SHALL reference `bp/.refactor-report.md` and `bp/specs/<domain>/spec.md`. The guardrails SHALL forbid (a) renaming exported symbols without updating every caller and the affected spec, (b) altering observable behavior — any failing test requires reverting the move, (c) editing specs outside the affected domains listed in the report, (d) introducing new dependencies or format/lint changes, and (e) dispatching further refactors — the refactorer SHALL stop after one assigned module.

#### Scenario: REFACTORER_PROMPT exposes required sections

- **GIVEN** the `REFACTORER_PROMPT` constant is exported from `src/templates/agents/index.ts`
- **WHEN** the string is inspected
- **THEN** it contains `## Role`, `## Inputs`, `## Behaviors`, `## Guardrails`
- **AND** it references `bp/.refactor-report.md`
- **AND** it references `bp/specs/`.

#### Scenario: AGENT_PROMPTS exposes the refactorer role

- **GIVEN** the `AGENT_PROMPTS` map exported from `src/templates/agents/index.ts`
- **WHEN** `AGENT_PROMPTS['refactorer']` is read
- **THEN** its value is a non-empty string identical to `REFACTORER_PROMPT`.

#### Scenario: platform generators render the refactorer body

- **GIVEN** a ProjectConfig with `platform: [omp, claude-code, opencode, agent]`
- **WHEN** each platform's `generate*` function runs with role `refactorer`
- **THEN** the produced agent file embeds `AGENT_PROMPTS['refactorer']` as its body
- **AND** each generated file's frontmatter names the file `bp-refactorer.md`.

#### Scenario: guardrails constrain behavior preservation

- **GIVEN** the `REFACTORER_PROMPT` guardrails block
- **WHEN** parsed for invariant keywords
- **THEN** it contains the substring `revert` and the substring `behavior preserv`
- **AND** it states that spec edits are limited to `bp/specs/<domain>/spec.md` files referenced in the assigned module's report section.
