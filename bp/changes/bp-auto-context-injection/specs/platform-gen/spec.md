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
