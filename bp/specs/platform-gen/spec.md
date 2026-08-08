# Platform-Gen — Initial Spec
## SHALL
### SHALL support four platforms: omp, claude-code, agent, codex
- SHALL `bp update`: iterate over `project.yml.platform` array and generate files for each listed platform.
  - GIVEN `platform: [omp, agent]`
  - WHEN `bp update` runs
  - THEN `.omp/commands/`, `.omp/agents/`, AND `.agent/skills/`, `.agent/agents/` are all generated

### SHALL generate `.agent/skills/` with [BP:xxx] parameter format
- SHALL `.agent/skills/bp-<step>/SKILL.md`: use `[BP:MILESTONE_ID]`, `[BP:CHANGE_NAME]`, etc. instead of `$1`/`$ARGUMENTS`.
  - GIVEN a workflow step template with `$1` in body
  - WHEN generating the `.agent/skills/` version
  - THEN `$1` is replaced by `[BP:CHANGE_NAME]` (or appropriate `[BP:xxx]` key)
  - AND `[BP:xxx]` parameters are substituted by `expandTemplateVars()` at runtime

### SHALL generate `.agent/agents/` with generic frontmatter
- SHALL `.agent/agents/bp-<role>.md`: use generic frontmatter fields (name, description, role, tools) instead of OMP-specific fields.
  - GIVEN the same agent definition
  - WHEN generating the `.agent/` version
  - THEN frontmatter does NOT include OMP-specific fields like `modelRoles` or `thinkingLevel`
  - AND tools are listed as a simple YAML array


## MUST
### MUST keep OMP generator unchanged
- MUST all existing OMP generator code: remain functional when `platform` includes `omp`.
  - GIVEN `platform: [omp]` (single entry)
  - WHEN `bp update` runs
  - THEN output is identical to before m2-claude-code changes

### MUST support single and multiple platform entries
- MUST `bp update`: handle both single-platform and multi-platform `platform` arrays.
  - GIVEN `platform: [agent]`
  - WHEN `bp update` runs
  - THEN only `.agent/` files are generated
  - GIVEN `platform: [omp, claude-code, agent]`
  - WHEN `bp update` runs
  - THEN all three platforms' files are generated


## Requirements
### Requirement: Compact Context Map Surface
The system SHALL expose `generateCompactContext(bpDir, opts)` returning a `CompactContext` object whose `specs[]` and `conventions[]` arrays each contain entries with `path`, `title`, and `lineCount` fields. The `title` SHALL be extracted from the file's first H1 or H2 line and SHALL fall back to the file stem (filename without `.md`) when no heading is present. The `activeChange` field SHALL be `null` when every entry under `bp/changes/` has status `archived`, and SHALL reference the most-recently-modified non-archived change otherwise.

### Requirement: Compact Payload Budget
The system SHALL render `CompactContext` via `formatContextCompact(result)` as a `<bp-context>...</bp-context>` markdown block AND via `formatContextCompactJson(result)` as a `JSON.stringify` of the same object. The compact payload SHALL NOT exceed 4096 bytes. Rules SHALL render as bullet lists prefixed with `- artifact:`.

### Requirement: bp Context Format Selection
The system SHALL expose `bp context <step> [--format=full|compact|json] [--change <name>]` whose `--format=full` produces terminal output identical to the existing back-compat surface, whose `--format=compact` emits the `<bp-context>` markdown block to stdout, and whose `--format=json` emits a JSON.parse-able `CompactContext` object. The default format SHALL be `full`.

### Requirement: bp Context Change Reference Resolution
The system SHALL accept `--change <name>` and SHALL exit non-zero with a clean stderr message when `<name>` does not resolve to a directory under `bp/changes/`. The system SHALL exit non-zero with a clean stderr message when `bp/config.yaml` is missing from the target directory.

### Requirement: Context JSONL Reference List Artifact
The system SHALL accept `bp/changes/<name>/context.jsonl` as the canonical spec / convention / artifact reference list for a change. Each row SHALL match the Zod schema `{ file: string; reason: string; phase?: string; tag?: string; read?: string; range?: [number, number] }`.

### Requirement: OMP Extension Generator Surface
The system SHALL expose `generateExtension(config) => { path, content }` in `src/integrations/omp/extension.ts` that returns a file descriptor for `.omp/extensions/bp/index.ts`. The system SHALL expose `generateLegacyShim(config) => { path, content }` in `src/integrations/omp/legacy-shim.ts` that returns a file descriptor for `.omp/hooks/pre/bp.ts`. Both generators SHALL be registered as part of the `omp` `PlatformProvider`.

### Requirement: OMP Extension Runtime Surface
The system SHALL export `EXTENSION_SOURCE` (a self-contained TypeScript source string) and `SHIM_SOURCE` (a 5-line legacy-shim source string) from `src/integrations/omp/extension-runtime.ts`. The runtime SHALL additionally export `handleSessionStart`, `handleBeforeAgentStart`, `handleContext`, `isDisabled`, `hasBpConfig`, `detectAgentType`, and `renderCompactBlock` as testable handler helpers.

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


### Requirement: OMP Extension Post-Compaction Recovery
The `context` handler SHALL inspect `ctx.lastCompactionTs` and `ctx.lastInjectionTs`. When `lastCompactionTs > lastInjectionTs`, the handler SHALL reverse-scan `ctx.recentMessages` for any entry whose `customType` is `bp-workflow-state`. If none is found, the handler SHALL return `{ message: { role: 'custom', customType: 'bp-workflow-state', content: [...], timestamp: <number> } }` to re-inject the workflow state. When `lastCompactionTs <= lastInjectionTs`, or when both timestamps are undefined, the handler SHALL return `undefined`.

### Requirement: OMP Extension Env Bypass
When `process.env.BP_HOOKS === '0'` OR `process.env.BP_DISABLE_HOOKS === '1'`, every handler (`session_start`, `before_agent_start`, `context`) SHALL return immediately without calling `api.sendMessage` and without returning a message value.

### Requirement: OMP Extension Config Skip
When `existsSync(join(cwd, 'bp', 'config.yaml'))` is `false`, every handler SHALL return immediately without calling `api.sendMessage` and without returning a message value.

### Requirement: OMP Extension Byte-Determinism
Two consecutive invocations of `generateExtension(config)` and `generateLegacyShim(config)` with the same `ProjectConfig` SHALL produce byte-identical `path` and `content` fields (no `Date.now()`, no `Math.random()`, no environment lookups inside the generator).

### Requirement: OMP Extension Legacy Shim
`generateLegacyShim` SHALL emit a `.omp/hooks/pre/bp.ts` file whose content re-exports the default export from `../extensions/bp/index.js`. The shim SHALL be at most 6 non-empty lines and SHALL include a header comment identifying it as a generated legacy-hook shim.

### Requirement: OMP Extension Template Source
`src/templates/omp/extension.ts.tmpl` SHALL export `EXTENSION_SOURCE` (the same string as `extension-runtime.ts` re-exports). `src/templates/omp/legacy-shim.ts.tmpl` SHALL export `SHIM_SOURCE`. The generator modules SHALL consume these constants — no inline string literal duplicates the source-of-truth content.

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


### Requirement: claude-code-hook-runtime
The system SHALL extend the registered `claude-code` platform to generate a deterministic `.claude/settings.json` hook configuration and an independent `.claude/hooks/bp-claude-handler.mjs` runtime using the five-event Blueprint hook contract.
#### Scenario: Generate Claude Code hook files
- **GIVEN** a valid project configuration with `platform: [claude-code]`
- **WHEN** platform generation runs
- **THEN** `.claude/settings.json` and `.claude/hooks/bp-claude-handler.mjs` SHALL be generated
- **AND** existing Claude Code command and agent files SHALL remain generated.

#### Scenario: Wire the five lifecycle events
- **GIVEN** generated `.claude/settings.json`
- **WHEN** the JSON is parsed
- **THEN** its top-level `hooks` object SHALL contain exactly `SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`, and `PostToolUse`
- **AND** `PreToolUse` and `PostToolUse` SHALL have matcher `Bash`
- **AND** every hook command SHALL invoke `.claude/hooks/bp-claude-handler.mjs` with its event name.

#### Scenario: Inject context and workflow state
- **GIVEN** `bp/config.yaml` exists and the generated handler receives a supported event
- **WHEN** Claude Code invokes `SessionStart`
- **THEN** the handler SHALL execute `bp context apply --format=compact` and place the validated output in `hookSpecificOutput.additionalContext`
- **WHEN** Claude Code invokes `UserPromptSubmit`, `PreToolUse`, or `PostToolUse`
- **THEN** the handler SHALL place the trimmed current `bp/state.md` content in `hookSpecificOutput.additionalContext`
- **AND** each emitted response SHALL contain `continue: true` and the matching `hookEventName`.

#### Scenario: Stop event is a successful no-op
- **GIVEN** a configured project
- **WHEN** Claude Code invokes `SessionEnd`
- **THEN** the handler SHALL exit successfully with `continue: true`
- **AND** it SHALL not invoke the bp runtime or emit workflow-state content.

#### Scenario: Hooks are safely bypassed
- **GIVEN** `BP_HOOKS=0`, `BP_DISABLE_HOOKS=1`, or no `bp/config.yaml`
- **WHEN** any generated handler event is invoked
- **THEN** the handler SHALL exit successfully with `{ "continue": true }`
- **AND** SHALL not call the bp runtime.

#### Scenario: Context failures use a deterministic fallback
- **GIVEN** `bp/config.yaml` exists but the bp executable fails or returns output without `<bp-context>` wrapper tags
- **WHEN** `SessionStart` is invoked
- **THEN** the handler SHALL emit `<bp-context>\n</bp-context>` as `additionalContext`
- **AND** SHALL still exit successfully with valid JSON.

#### Scenario: Generated bytes are deterministic
- **GIVEN** the same ProjectConfig and workflow sources
- **WHEN** Claude Code generation runs twice
- **THEN** every generated path and content byte SHALL be identical
- **AND** the handler source SHALL not depend on clock, randomness, or generation-time environment values.

#### Scenario: Cleanup preserves unrelated Claude files
- **GIVEN** stale generated `.claude/settings.json` and `.claude/hooks/bp-claude-handler.mjs`, plus unrelated `.claude/notes.txt` and hook files
- **WHEN** `bp update` runs without generating the stale paths
- **THEN** only the two exact stale generated paths SHALL be removed
- **AND** unrelated Claude files SHALL remain unchanged.


### Requirement: hook-config-merge-preservation
The system SHALL merge generated hook entries into existing `.claude/settings.json` and `.codex/hooks.json` item-by-item instead of overwriting them, and SHALL back up the pre-update file to `<path>.bak` before any modification.
#### Scenario: User content survives update
- **GIVEN** `.claude/settings.json` or `.codex/hooks.json` contains user-owned keys and hook groups alongside bp-generated groups
- **WHEN** `bp update` runs with the platform still configured
- **THEN** user-owned keys and non-bp hook groups SHALL remain unchanged
- **AND** bp hook groups SHALL be refreshed to the current generation
- **AND** the pre-update file SHALL be preserved at `<path>.bak`

#### Scenario: Renamed events migrate
- **GIVEN** an existing bp hook group on `SessionStop` in `.claude/settings.json`
- **WHEN** `bp update` runs with claude-code configured
- **THEN** the `SessionStop` group SHALL be removed
- **AND** `SessionEnd` SHALL be wired to the generated handler instead

#### Scenario: Platform removal strips only bp hooks
- **GIVEN** `.claude/settings.json` or `.codex/hooks.json` contains both bp and user-owned hook groups, and the platform is removed from the config
- **WHEN** `bp update` runs
- **THEN** bp hook groups SHALL be stripped and user-owned content SHALL remain
- **AND** the file SHALL be deleted only when no user-owned content remains


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



