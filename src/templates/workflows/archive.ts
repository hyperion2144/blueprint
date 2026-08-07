import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, use the most recently reviewed change.

## Prerequisites

- \`review.md\` exists and Overall Verdict is PASS.
- No unresolved issues in review.md \`## Issues\`.

## Steps

## Orchestrator Steps

> These are the steps you (orchestrator) execute in order. \`bp archive\` only outputs these steps — it does not auto-execute. The actual archive is done by \`bp finish\`.

### Step 1: Resolve change name and paths

Same as plan workflow Step 1.

### Step 2: Pre-archive check

Read \`bp/changes/$1/review.md\`: verify Overall Verdict is PASS and \`## Issues\` has no \`- [ ]\` entries. Run \`git status --porcelain\`; warn the user about uncommitted changes outside bp/ (half-done code may get archived alongside the change).

If review is not PASS:
\`\`\`
Cannot archive: review not passed
  Verdict: FAIL/NEEDS_REVISION
  Unresolved issues: N

  Fix issues first: bp check $1
\`\`\`

### Step 3: Archive check — reconcile delta specs with reality

The change's delta specs must match what was implemented before merging into \`bp/specs/\`. Read \`proposal.md\` (PR-N behaviors), \`design.md\` (DS-N), the implementation (source + tests), and each delta spec at \`specs/<domain>/spec.md\`:
- For every implemented behavior the delta spec does not yet require, ADD a requirement (with a scenario).
- For every delta requirement whose described behavior drifted from the implementation, MODIFY it — write the full new text and annotate with \`(was: ...)\`.
- Write ONLY to the change's \`specs/<domain>/spec.md\` delta files — never to \`bp/specs/\` directly. \`bp finish\` performs the merge.

### Step 4: Run finish command

\`\`\`bash
bp finish $1
\`\`\`

The command verifies the review PASS gate, gates context.jsonl for the archive phase, merges each delta spec into \`bp/specs/<domain>/spec.md\`, moves the change to \`bp/changes/archive/<date>-$1/\`, and updates \`bp/roadmap.md\` when the proposal has a \`## Roadmap Reference\`.

If it reports a merge conflict, resolve it in the delta spec and re-run.

### Step 5: Verify archive success

- \`bp/changes/archive/<date>-$1/\` exists and contains all artifacts (proposal.md, design.md, tasks.md, specs/, review.md).
- \`bp/changes/$1/\` no longer exists.
- Each ADDED/MODIFIED/REMOVED delta requirement is reflected in \`bp/specs/<domain>/spec.md\`.
- The roadmap change is marked \`- [x]\` (if applicable).
- No merge-conflict errors in the command output.

### Step 6: Commit changes

The archive command does NOT run git commit. Commit the merged specs, roadmap, and archived change:

\`\`\`bash
bp commit "archive: $1 - specs merged, roadmap updated" --files bp/specs/ bp/roadmap.md bp/changes/
\`\`\`

### Step 7: Suggest next step

\`\`\`
Archived $1
  - Delta specs merged into bp/specs/
  - Change moved to bp/changes/archive/<date>-$1/
  - Roadmap updated

  Next: bp continue (or: bp propose <new-change>)
\`\`\`

## Output

- Change archived under \`bp/changes/archive/<date>-$1/\` with merged global specs and updated roadmap.

## Guardrails

- Review must PASS before archive — the command enforces this, but pre-checking saves a failed run.
- Archive-check writes only to the change's delta specs; never edit \`bp/specs/\` directly.
- On merge conflict, resolve in the delta spec (change directory) and re-run \`bp finish $1\`.
- Archive preserves full context — all artifacts move together.
- CI mode (\`--ci\`): skip working-tree warnings and post-archive suggestions; exit 0 on success, 1 on any failure.
- Commit is the orchestrator's job — the archive command does not commit.
`;

export function getArchiveSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-archive',
    description: 'Verify and archive (run command + verify result)',
    instructions,
  };
}

export function getArchiveCommandTemplate(): CommandTemplate {
  return {
    description: 'Verify and archive (run command + verify result)',
    category: 'Workflow',
    tags: ['bp', 'archive', 'verify', 'specs', 'roadmap'],
    content: instructions,
  };
}
