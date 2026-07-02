/**
 * Shared constants for workflow templates — eliminates cross-template duplication.
 *
 * Follows the ORCHESTRATOR_RULE pattern from types.ts.
 */

/** Change name + context resolution — replaces repeated paragraphs in plan/apply/review/verify/archive. */
export const CHANGE_NAME_RESOLVE = (status: string, step: string): string => `### Resolve change
If change name provided: use it. If not: run \`bp state\`, read \`pending\` array, filter by status \`${status}\`, ask user to pick. Then run \`bp context ${step}\` and read all listed files.

`;

/** Lightweight/Full classification — replaces repeated classification in plan/apply/review/verify. */
export const CLASSIFY_CHANGE = `### Classify change
Read \`tasks.md\` task types:
- **Lightweight**: ALL tasks type: config|docs|refactor|scaffolding — no type:behavior
- **Full**: any type:behavior task

`;

/** Change path resolution — replaces path construction in plan/apply. */
export const RESOLVE_PATHS = `### Resolve paths
Run \`bp state\` for \`milestone\` and \`phase\`. Change directory:
\`bp/milestones/<mid>/phases/<pid>/changes/<name>/\` (adhoc: \`bp/changes/<name>/\`)

`;

/** Read context before designing — replaces repeated "read before design" in plan. */
export const READ_CONTEXT = `### Read context — MUST read before designing
Read these to ensure alignment with prior decisions:
- \`bp/requirements.md\` — project requirements, constraints, success criteria
- \`bp/roadmap.md\` — this phase's goal, scope, and deliverables
- \`bp/milestones/<mid>/phases/<pid>/research.md\` — implementation research
- \`bp/milestones/<mid>/phases/<pid>/context.md\` — locked decisions from discuss phase
- Never design in isolation — design must trace back to requirements and research.

`;

/** Commit + advance — replaces each template's trailing commit and advance steps. */
export const COMMIT_ADVANCE = (scope: string, desc: string): string => `### Commit & advance
\`\`\`bash
bp commit "docs(${scope}): ${desc}" --files "<files>" --scope ${scope} --record
\`\`\`
Run \`bp continue\` to proceed.
`;

/** Truncation guard — replaces repeated ---END--- check in continue/auto. */
export const TRUNCATION_GUARD = `**Check output completeness**: Confirm \`---END---\` marker exists and \`chars:\` value matches. Missing or mismatched = output truncated — re-run the command.
`;
