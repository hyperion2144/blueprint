/**
 * Shared constants for workflow templates — eliminates cross-template duplication.
 *
 * v2: Simplified for spec-driven workflow. Removed state-machine and milestone/phase path references.
 */

/** Change name + context resolution — replaces repeated paragraphs in plan/apply/review/archive. */
export const CHANGE_NAME_RESOLVE = (changeDir: string, step: string): string => `### Resolve change
If \`$ARGUMENTS\` is non-empty: use as change name directly.
Otherwise list \`bp/changes/\` (exclude \`archive/\`) for active changes.

The orchestrator provides the change name — do not guess.

**Resolved path**: \`${changeDir}\`

Run \`bp context ${step}\` for resolved paths in the \`dirs:\` section.
`;

/** Lightweight/Full classification — replaces repeated classification in plan/apply/review. */
export const CLASSIFY_CHANGE = `### Classify change
Read \`tasks.md\` task types:
- **Lightweight**: ALL tasks type: config|docs|refactor|scaffolding — no type:behavior
- **Full**: any type:behavior task

`;

/** Schema reminder for `context.jsonl` rows used by the OMP auto-injection contract. */
export const CONTEXT_JSONL_REMINDER = `### Context injection (OMP Extension)

Context is auto-injected by the OMP Extension at session_start. Do NOT call \`bp context <step>\` yourself — the extension already provides the same material at every turn.

When reading \`bp/changes/<name>/context.jsonl\`, every row follows the schema:

\`\`\`json
{ "file": "<path>", "reason": "<why>", "phase": "plan|apply|review|archive|all", "tag": "<label>", "read": "full|range", "range": [<start>, <end>] }
\`\`\`

Row fields:

- \`file:\` repository-relative path the change depends on. Required.
- \`reason:\` short invariant or invariant-style reason the file exists in the change. Required, ≤ 200 chars.
- \`phase:\` one of \`plan\`, \`apply\`, \`review\`, \`archive\`, or \`all\`. Optional, default \`all\`.
- \`tag:\` free-form label such as \`guard-rail\`, \`invariant\`, \`spec\`, \`convention\`, or \`config\`. Optional.
- \`read:\` either \`full\` (default) or \`range\`. When \`range\`, the row must include \`range:\` as \`[start, end]\` line numbers.

`;
