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
- When the template name matches none of the above, the emitted body SHALL be the paths-only `<bp-context>` block with no augmentation.

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
- **THEN** its top-level `hooks` object SHALL contain exactly `SessionStart`, `SessionStop`, `UserPromptSubmit`, `PreToolUse`, and `PostToolUse`
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
- **WHEN** Claude Code invokes `SessionStop`
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



