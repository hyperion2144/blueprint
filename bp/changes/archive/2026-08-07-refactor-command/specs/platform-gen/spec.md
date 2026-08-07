# Delta Spec: platform-gen

> Change: refactor-command | Domain: platform-gen

## ADDED Requirements

### Requirement: Refactor-Step-Generation

The system SHALL register a `refactor` workflow step in `WORKFLOW_REGISTRY` and `STEP_DEFS` and SHALL generate the per-platform files listed below when the `refactor` step is active. The CLI command `bp refactor <target>` SHALL print the workflow step's instructions to stdout without analyzing or rewriting any code. The per-platform file paths SHALL match the existing platform conventions:

- `.omp/commands/bp-refactor.md` — frontmatter `name: bp:refactor`, `description`, `argument-hint: "<target>"`, body = `WORKFLOW_REGISTRY['refactor'].command().content`.
- `.claude/commands/bp-refactor.md` — frontmatter `name: bp:refactor`, `description`, `argument-hint: "<target>"`, body = same content.
- `.opencode/commands/bp-refactor.md` — frontmatter `description`, body = same content.
- `.agent/skills/bp-refactor/SKILL.md` — frontmatter `name: bp-refactor`, `description`, `hide: false`, body = `WORKFLOW_REGISTRY['refactor'].skill().instructions`.
- `.agents/skills/bp-refactor/SKILL.md` — Codex variant; frontmatter `name: bp:refactor`, `description`, body = same content.

The body emitted on every platform SHALL be byte-identical to `WORKFLOW_REGISTRY['refactor'].command().content` and SHALL contain the section headers `## Input`, `## Steps`, `## Output`, `## Guardrails` in English-only prose.

#### Scenario: refactor step generates across all five platforms

- **GIVEN** a ProjectConfig with `platform: [omp, claude-code, opencode, agent, codex]`
- **WHEN** `bp update` runs
- **THEN** `.omp/commands/bp-refactor.md`, `.claude/commands/bp-refactor.md`, `.opencode/commands/bp-refactor.md`, `.agent/skills/bp-refactor/SKILL.md`, AND `.agents/skills/bp-refactor/SKILL.md` are all generated
- **AND** each generated file's body is byte-identical to the other four (modulo frontmatter wrapping).

#### Scenario: bp refactor CLI prints step instructions

- **GIVEN** an initialized bp project at any directory
- **WHEN** `bp refactor src/core` runs
- **THEN** stdout contains the full `WORKFLOW_REGISTRY['refactor'].command().content` body
- **AND** the command does not write any file outside the project
- **AND** the command exits with code `0`.

#### Scenario: bp refactor CLI prints path error for empty target

- **GIVEN** an initialized bp project
- **WHEN** `bp refactor ""` runs (empty target)
- **THEN** stderr contains `Usage: bp refactor <target> [--change <name>]`
- **AND** the command exits with code `1`.

#### Scenario: bp refactor CLI reports missing project

- **GIVEN** a directory without a `bp/` folder
- **WHEN** `bp refactor src/core` runs
- **THEN** stderr contains `Not in a blueprint project. Run "bp init" first.`
- **AND** the command exits with code `1`.

### Requirement: Refactor-Analyzer-Contract

The system SHALL provide `bp refactor analyze <target>` that runs the deterministic analyzer engine in `src/core/refactor-analyzer.ts`. The analyzer SHALL compute per-module evidence for the four anti-pattern metrics (fragmentation, duplication, flatness, low reuse) and a deep-module depth ratio. The analyzer SHALL write `bp/.refactor-report.md` and print a one-line stdout summary. All thresholds SHALL be configurable via `bp/config.yaml` under the `refactor:` block, with the following documented defaults:

- `refactor.thresholds.fragmentation.exportsMax` = `2`
- `refactor.thresholds.fragmentation.fileLinesMax` = `50`
- `refactor.thresholds.duplication.similarityMin` = `0.8`
- `refactor.thresholds.duplication.gramSize` = `15`
- `refactor.thresholds.flatness.maxDepth` = `1`
- `refactor.thresholds.flatness.subdirMin` = `2`
- `refactor.thresholds.lowReuse.fanInMax` = `1`
- `refactor.thresholds.lowReuse.exportsMin` = `3`

The reported per-module evidence SHALL be deterministic across two consecutive runs that use the same input and thresholds (no clock / randomness / environment-dependent bytes inside the report content).

#### Scenario: analyzer emits structured report and stdout summary

- **GIVEN** an initialized bp project whose source tree contains one fragmented module, one duplicated block pair, one flat module, and one low-reuse module
- **WHEN** `bp refactor analyze .` runs
- **THEN** `bp/.refactor-report.md` exists
- **AND** the file contains `## Summary` followed by per-module blocks `## Module: <name>`
- **AND** stdout contains a line beginning with `Refactor report for .:` listing counts
- **AND** the command exits with code `0`.

#### Scenario: analyzer detects cross-module duplication

- **GIVEN** an initialized bp project whose source tree contains two files in different modules sharing a duplicated block above the similarity threshold
- **WHEN** `bp refactor analyze .` runs
- **THEN** the report contains a `## Cross-Module Duplication` section listing both file paths and their module names
- **AND** the `## Summary` duplication-pairs count includes the cross-module pair
- **AND** each such pair is not attributed to a single per-module `### Duplication` block.

#### Scenario: threshold overrides change the findings

- **GIVEN** a project whose `bp/config.yaml` defines `refactor.thresholds.fragmentation.exportsMax: 5`
- **WHEN** `bp refactor analyze .` runs
- **THEN** modules with up to 5 exports are NOT reported as fragmented
- **AND** the report header prints the active thresholds.

#### Scenario: analyzer is deterministic

- **GIVEN** an initialized project with the same source state
- **WHEN** `bp refactor analyze .` is invoked twice without source changes in between
- **THEN** the two `bp/.refactor-report.md` files are byte-identical.

#### Scenario: analyzer reuses or refreshes the codebase map

- **GIVEN** a project whose `bp/.codebase-map.json` is stale (fingerprint mismatch with source)
- **WHEN** `bp refactor analyze .` runs
- **THEN** the analyzer rebuilds the map via `generateCodebaseMap` before computing findings
- **AND** the analyzer writes a fresh `.codebase-map.json` alongside `.refactor-report.md`.

#### Scenario: report file path is `.refactor-report.md` inside `bp/`

- **GIVEN** an initialized bp project at any directory
- **WHEN** `bp refactor analyze src/core` runs successfully
- **THEN** the written file's absolute path is `<bpDir>/.refactor-report.md`
- **AND** `readRefactorReport(bpDir)` returns the same string the analyzer produced.

### Requirement: Refactorer-OMPSub-Agent-Discrimination

The OMP Extension runtime SHALL widen `AgentType` to include `'refactorer'`. The `detectAgentType(ctx)` function SHALL return `'refactorer'` when `ctx.agentTemplate` contains the substring `refactorer`. The `session_start` / `before_agent_start` handlers SHALL, for the `'refactorer'` agent type, render an additional `## Refactor Targets` section in the emitted `<bp-context>` block whose body inlines the `## Summary` block of `bp/.refactor-report.md` when that file exists.

#### Scenario: detectAgentType recognizes refactorer

- **GIVEN** an `ExtensionContext` whose `agentTemplate === 'bp-refactorer'`
- **WHEN** `detectAgentType(ctx)` runs
- **THEN** the return value equals `'refactorer'`
- **AND** the `bp-context` block emitted at session_start contains a `## Refactor Targets` section followed by the report's summary text.

#### Scenario: detectAgentType falls back to default for non-refactorer templates

- **GIVEN** an `ExtensionContext` whose `agentTemplate === 'unrelated-agent'`
- **WHEN** `detectAgentType(ctx)` runs
- **THEN** the return value equals `'default'`
- **AND** no `## Refactor Targets` section is rendered.

