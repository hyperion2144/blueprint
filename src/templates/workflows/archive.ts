import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, use the most recently reviewed change.

## Prerequisites

- \`review.md\` exists and Overall Verdict is PASS
- No unresolved issues in review.md \`## Issues\` section

## Steps

### Step 1: Resolve change name and paths

Same as plan workflow Step 1.

### Step 2: Pre-archive check (optional but recommended)

Read \`bp/changes/$1/review.md\`:
- Check Overall Verdict is PASS
- Check \`## Issues\` section has no \`- [ ]\` entries (all should be [x] or empty)
- Run \`git status --porcelain\` — if there are uncommitted changes outside bp/, warn the user. Uncommitted half-done code may get archived alongside the change.

If review is not PASS:
\`\`\`
Cannot archive: review not passed
  Verdict: FAIL/NEEDS_REVISION
  Unresolved issues: N

  Fix issues first: bp apply --fix $1
\`\`\`

### Step 3: Run archive command

The \`bp archive\` command handles everything: review verification, delta spec merge, change directory move, and roadmap update.

\`\`\`bash
bp archive $1
\`\`\`

The command will:
1. Verify review.md verdict is PASS and no unresolved issues
2. Gate context.jsonl validity for archive phase
3. Merge each delta spec (\`specs/<domain>/spec.md\`) into global spec (\`bp/specs/<domain>/spec.md\`) via mergeDeltaSpec
4. Move change directory to \`bp/changes/archive/<date>-$1/\`
5. Update \`bp/roadmap.md\` if proposal has \`## Roadmap Reference\`

If the command reports a merge conflict, resolve it in the delta spec and re-run.

### Step 4: Verify archive success

Check the following after the command completes:

1. **Archive directory exists**: \`bp/changes/archive/<date>-$1/\` exists and contains all artifacts (proposal.md, design.md, tasks.md, specs/, review.md)
2. **Source directory removed**: \`bp/changes/$1/\` no longer exists
3. **Delta specs merged**: For each domain in the change's \`specs/\`:
   - ADDED requirements appear in \`bp/specs/<domain>/spec.md\`
   - REMOVED requirements are gone from \`bp/specs/<domain>/spec.md\`
   - MODIFIED requirements are replaced in \`bp/specs/<domain>/spec.md\`
4. **Roadmap updated** (if proposal had \`## Roadmap Reference\`): the change is marked \`- [x]\` in \`bp/roadmap.md\`
5. **No conflict residue**: the command output shows no merge conflict errors

If any check fails, investigate — the archive command may have partially completed.

### Step 5: Commit changes

The archive command does NOT run git commit. Commit the merged specs, roadmap, and archived change:

\`\`\`bash
bp commit "archive: $1 - specs merged, roadmap updated" --files bp/specs/ bp/roadmap.md bp/changes/
\`\`\`

### Step 6: Suggest next step

Output:
\`\`\`
Archived $1
  - Delta specs merged into bp/specs/
  - Change moved to bp/changes/archive/<date>-$1/
  - Roadmap updated

  Next: bp continue (or: bp propose <new-change>)
\`\`\`

## Guardrails

- **Review must PASS before archive.** The archive command enforces this, but pre-checking saves a failed command.
- **The archive command is the source of truth for the merge/move/roadmap operations.** Do NOT manually merge specs, move files, or update roadmap — the command does it all.
- **If merge conflict occurs**, resolve in the delta spec (change directory) and re-run \`bp archive $1\`. Do NOT edit global specs directly.
- **Archive preserves full context.** All artifacts move to archive together.
- **Commit is the orchestrator's job** — the archive command does not commit.
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
