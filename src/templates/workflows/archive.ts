import { CLASSIFY_CHANGE, CHANGE_NAME_RESOLVE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to verify and archive. Provided by \`bp continue\` output or user.

### Prerequisites
- Review phase complete: spec-review.md, quality-review.md, goal-review.md
- All review blockers resolved

## Steps

${CLASSIFY_CHANGE}${CHANGE_NAME_RESOLVE('reviewing', 'archive')}### Step 2: Run verification checks

Run checks first — do NOT write verification.md yet:

**All changes:**
- Run \`npx tsc --noEmit\` — must pass
- Run \`npx vitest run\` — must pass

**Full changes additionally:**
- Verify each delta-spec SHALL/MUST has a passing test
- Verify TDD commit integrity: RED→GREEN→REFACTOR sequence for each type:behavior task

### Step 3: Write verification.md + route

**All checks passed:**
1. Get template: \`bp template verification\`
2. Write \`verification.md\` to the change directory (it will be archived together with the change)
3. Status: \`passed\`

**Any check failed:**
- Write verification.md with \`gaps_found\`, route back to apply (reapply) or plan (replan)
- Do NOT archive — stop here

### Step 4: Execute archival
Run \`bp archive <change-dir>\`. The CLI handles: delta-spec merge, directory move to archive/, state.md update.
verification.md is moved to archive together with the change.

### Step 5: Verify merge result
Check the global spec \`bp/specs/<domain>/spec.md\` (<domain> = directory under \`bp/specs/\`):
- ADDED Requirements from delta are present
- REMOVED Requirements from delta are gone
- No duplicate \`### Requirement: xxx\` headers
- If the CLI warned about a skipped domain, the delta-spec directory name didn't match any domain in \`bp/specs/\` — fix the domain name in the change's \`specs/\` directory and re-archive

### Step 6: Commit + check if last change
Run \`bp state\`, check the \`pending\` list.

**If more pending changes remain:**
\`\`\`bash
bp commit "docs(archive): archive <change-name>" \\
  --files "bp/archive/<milestone>/<phase>/<change>/" \\
  --scope docs --record
\`\`\`

**If this was the LAST change in the phase:**
1. Write phase summary: \`bp template summary\` → \`bp/milestones/<mid>/phases/<pid>/summary.md\`
2. Commit archive + summary:
\`\`\`bash
bp commit "docs(archive): archive <change-name>, phase complete" \\
  --files "bp/archive/<milestone>/<phase>/<change>/,bp/milestones/<mid>/phases/<pid>/summary.md" \\
  --scope docs --record
\`\`\`

### Step 7: Advance
Run \`bp continue\` — routes to next change or ship-phase.

## Guardrails
- No sub-agent — run checks yourself
- Verify FIRST, then write verification.md — if verification fails, do NOT archive
- verification.md goes IN the change directory, archived together with the change
- Commit --files points to \`bp/archive/\` directory (the archived location)
- Last change in phase: must write summary.md before advancing
- Test suite must pass completely — never archive a failing change`;

export function getArchiveSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-archive',
    description: 'Verify & archive — run checks, write results, archive, commit',
    instructions,
  };
}

export function getArchiveCommandTemplate(): CommandTemplate {
  return {
    description: 'Verify & archive — run checks, write results, archive, commit',
    category: 'Workflow',
    tags: ['bp', 'archive', 'verify', 'specs', 'merge'],
    content: instructions,
  };
}
