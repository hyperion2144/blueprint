# Delta Spec: platform-gen

> Change: bp-auto-context-injection | Domain: platform-gen

## ADDED Requirements

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
