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
