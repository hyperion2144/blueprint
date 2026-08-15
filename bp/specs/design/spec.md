# design
## Requirements
### Requirement: Design-Step-Templates
The system SHALL register five design workflow steps — `design`, `design-html`, `design-review`, `design-shotgun`, and `plan-design-review` — in `WORKFLOW_REGISTRY`, each providing a skill template and a command template whose instructions are a single self-contained English markdown string containing the section headers `## Input`, `## Steps`, `## Output`, and `## Guardrails` in order, with no template placeholders and no references to external binaries, platform-specific paths, or third-party design frameworks. The skill and command descriptions SHALL NOT contain the two-character sequence colon+space (`:`).
#### Scenario: registry exposes the five design steps
- **GIVEN** the `WORKFLOW_REGISTRY` exported from `src/templates/workflows/registry.ts`
- **WHEN** its keys are enumerated
- **THEN** it contains `design`, `design-html`, `design-review`, `design-shotgun`, and `plan-design-review`
- **AND** each entry's `skill().instructions` equals its `command().content`

#### Scenario: design instructions are self-contained
- **GIVEN** any of the five design steps' instructions strings
- **WHEN** parsed for forbidden content
- **THEN** the string contains `## Input`, `## Steps`, `## Output`, `## Guardrails` in order
- **AND** it contains no `{{` placeholder
- **AND** it contains none of `~/.gstack`, `Pretext`, or `gstack-config`
- **AND** it refers to browsing capability generically (no `$B goto`-style binary invocation)

#### Scenario: descriptions avoid the pi frontmatter colon trap
- **GIVEN** the skill and command descriptions of all five design steps
- **WHEN** each description is scanned for the regex `:` (colon followed by space)
- **THEN** zero matches are found

#### Scenario: plan-design-review is UI-audit only
- **GIVEN** the `plan-design-review` step instructions
- **WHEN** they are scanned for scope markers
- **THEN** they describe UI scope detection, DESIGN.md status, a 0-10 rating, focus areas, and a design-system conformance checklist for the planned UI changes
- **AND** they contain no platform-gate, codex-design-voice, or plan-mode EXIT machinery


### Requirement: Designer-Sub-Agent
The system SHALL provide a `designer` sub-agent registered under `AGENT_PROMPTS['designer']`, whose system prompt is a non-empty English string containing the sections `## Role`, `## Core Principles`, `## Inputs`, `## Behaviors`, `## Output`, and `## Guardrails`, embedding the shared sub-agent constraints, and whose role title contains the marker phrase `Design Consultant`. The prompt SHALL NOT contain the phrase `Change Design Specialist`.
#### Scenario: designer prompt is registered and structured
- **GIVEN** the `AGENT_PROMPTS` map exported from `src/templates/agents/index.ts`
- **WHEN** `AGENT_PROMPTS['designer']` is read
- **THEN** it is a non-empty string containing `## Role`, `## Core Principles`, `## Inputs`, `## Behaviors`, `## Output`, and `## Guardrails`
- **AND** it contains the substring `Design Consultant`
- **AND** it contains the shared constraint text `NEVER run bp continue`

#### Scenario: designer marker is disjoint from planner
- **GIVEN** the designer prompt and the planner prompt
- **WHEN** both are scanned for role-title phrases
- **THEN** the designer prompt contains no `Change Design Specialist` substring
- **AND** the planner prompt contains no `Design Consultant` substring

#### Scenario: designer is artifact-bound, not source-bound
- **GIVEN** the designer prompt guardrails
- **WHEN** they are inspected for edit authority
- **THEN** they forbid editing source code
- **AND** they direct design output to root `DESIGN.md`, change-dir `design-review.md`, or the `design/` scratch directory


### Requirement: Designer-Dispatch-And-Model-Tier
The system SHALL emit per-platform dispatch instructions from `bp dispatch designer` for every configured platform, SHALL list the `design-system` output template for the role, and SHALL resolve a `designer` model tier whose default equals the planner tier per profile and which is overridable via `config.models.designer`.
#### Scenario: dispatch designer prints per-platform instructions
- **GIVEN** an initialized bp project with the default platform set
- **WHEN** `bp dispatch designer` runs
- **THEN** stdout contains a `## Dispatch: bp-designer` section per configured platform
- **AND** stdout contains an `### Isolation` block describing the role as read-only
- **AND** stdout contains `### Model Selection` with `Role: designer` and a resolved model

#### Scenario: designer template list and model override
- **GIVEN** the dispatch output for the designer role
- **WHEN** inspected for template and model lines
- **THEN** the output template list contains `bp template design-system`
- **AND** when `models.designer` is set in `bp/config.yaml`, the printed model equals that value


### Requirement: Design-CLI-Commands
The system SHALL provide the CLI commands `bp design`, `bp design-html`, `bp design-review`, `bp design-shotgun`, and `bp plan-design-review`, each accepting an optional change-name argument, printing its step's full workflow instructions to stdout, and exiting 0; outside a blueprint project each SHALL print `Not in a blueprint project. Run "bp init" first.` to stderr and exit 1.
#### Scenario: design commands print instructions
- **GIVEN** an initialized bp project
- **WHEN** `bp design`, `bp design-html`, `bp design-review`, `bp design-shotgun`, and `bp plan-design-review` each run
- **THEN** each prints non-empty instructions containing `## Steps` and exits 0
- **AND** `bp --help` lists all five command names

#### Scenario: design commands fail cleanly outside a project
- **GIVEN** a directory without a `bp/` folder
- **WHEN** `bp design` runs there
- **THEN** stderr contains `Not in a blueprint project. Run "bp init" first.`
- **AND** the exit code is 1


### Requirement: Platform-Design-Step-Generation
The system SHALL generate the five design steps' skill files (and command files where the platform has commands) for every configured platform, and SHALL emit a `bp-designer.md` agent file from every platform agent generator. The generated design-step bodies SHALL be byte-identical to the workflow registry instructions, and generation SHALL remain byte-deterministic across consecutive runs.
#### Scenario: every configured platform emits the design steps
- **GIVEN** a ProjectConfig with `platform: [omp, claude-code, agent, codex, pi]`
- **WHEN** `bp update` runs
- **THEN** `.pi/skills/bp-design/SKILL.md`, `.pi/skills/bp-design-html/SKILL.md`, `.pi/skills/bp-design-review/SKILL.md`, `.pi/skills/bp-design-shotgun/SKILL.md`, and `.pi/skills/bp-plan-design-review/SKILL.md` all exist
- **AND** the corresponding skill files exist under `.omp/skills/` and `.agents/skills/` (shared by the generic `agent` and `codex` platforms)
- **AND** command files `bp:design*` exist under `.omp/commands/` and `.claude/commands/`
- **AND** each generated body is byte-identical to `WORKFLOW_REGISTRY[<step>].skill().instructions` (skills) or `.command().content` (commands)

#### Scenario: agent generators emit the designer role
- **GIVEN** a ProjectConfig with `platform: [omp, claude-code, agent, pi]`
- **WHEN** each platform's agent generator runs
- **THEN** each produced file set includes `bp-designer.md`
- **AND** the file body embeds `AGENT_PROMPTS['designer']`

#### Scenario: generation stays deterministic
- **GIVEN** the same ProjectConfig
- **WHEN** pi skill generation runs twice
- **THEN** every generated `.pi/skills/bp-<step>/SKILL.md` content byte is identical across the two runs


### Requirement: Designer-Agent-Type-Detection
The pi extension SHALL detect the `designer` sub-agent type from a system prompt containing the `Design Consultant` marker, in both the extension runtime and the generated extension template kept in lockstep, and SHALL emit the standard paths-only `<bp-context>` block for designer sessions.
#### Scenario: designer marker is detected
- **GIVEN** the pi extension runtime's prompt-based agent-type detection
- **WHEN** it receives a prompt containing `Design Consultant` or the shipped designer prompt body
- **THEN** the detected type is `designer`
- **AND** a designer session at session_start still receives a `bp-context` message containing `<bp-context>`
- **AND** the emitted block contains no `## Roadmap State` and no `## Invariants` section

#### Scenario: detection stays disjoint
- **GIVEN** every shipped agent prompt in `AGENT_PROMPTS`
- **WHEN** the detector processes each prompt
- **THEN** each prompt detects as exactly its own role's type (planner, executor, reviewer, codebase-scanner, refactorer, fixer, designer)
- **AND** the marker string appears in both the runtime source and the generated template source


### Requirement: Design-System-Artifact
The system SHALL provide a `design-system` artifact template whose body contains the `## Design System` section with Product Context, Aesthetic Direction, Typography, Color, Spacing, Layout, Motion, and Decisions Log blocks, SHALL render it without unsubstituted placeholders, and SHALL write it as `DESIGN.md` when generated without `--stdout`.
#### Scenario: design-system template renders the DESIGN.md shape
- **GIVEN** an initialized bp project
- **WHEN** `bp template design-system --stdout` runs
- **THEN** stdout contains `## Design System` and the subsections `### Product Context`, `### Aesthetic Direction`, `### Typography`, `### Color`, `### Spacing`, `### Layout`, `### Motion`, and `### Decisions Log`
- **AND** after placeholder substitution no `{{` remains

#### Scenario: non-stdout output targets root DESIGN.md
- **GIVEN** an initialized bp project and a target directory
- **WHEN** `bp template design-system` runs without `--stdout`
- **THEN** a file named `DESIGN.md` is written at the target directory
- **AND** its content matches the rendered template


### Requirement: Design-Review-Artifact-Tolerance
The system SHALL treat `bp/changes/<name>/design-review.md` as a known optional change artifact: a change directory containing it SHALL validate with the artifact validator producing no error for it, and the continue engine SHALL determine the next step identically whether or not the file is present.
#### Scenario: design-review.md is a recognized optional artifact
- **GIVEN** a change directory containing `design-review.md`
- **WHEN** `validateChange` runs on it
- **THEN** the validation results contain a `design-review` entry that is valid with zero errors

#### Scenario: absence of design-review.md does not block continue
- **GIVEN** a change whose review.md verdict is PASS
- **WHEN** `bp continue` runs both with and without `design-review.md` present in the change directory
- **THEN** the next-step output is identical in both cases


### Requirement: Core-Loop-Advisory-Hooks
The system SHALL include advisory references to the design track in the core plan and check workflow instructions: the plan step SHALL suggest `bp plan-design-review` for UI-scoped changes and the check step SHALL suggest `bp design-review` for UI-scoped changes, both without imposing a gate on the plan or check verdict.
#### Scenario: plan step suggests the plan-phase UI audit
- **GIVEN** the plan workflow instructions
- **WHEN** scanned for design-track references
- **THEN** they contain the substring `bp plan-design-review`
- **AND** they do not contain a MUST or SHALL requiring the design audit before planning completes

#### Scenario: check step suggests the design review
- **GIVEN** the check workflow instructions
- **WHEN** scanned for design-track references
- **THEN** they contain the substring `bp design-review`
- **AND** they do not contain a MUST or SHALL requiring the design audit before the check verdict



