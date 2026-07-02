import { CLASSIFY_CHANGE, CHANGE_NAME_RESOLVE, COMMIT_ADVANCE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to verify and archive. Provided by \`bp continue\` output or user.

### Prerequisites
- Review phase complete: spec-review.md, quality-review.md, goal-review.md
- All review blockers resolved

## Steps

${CLASSIFY_CHANGE}${CHANGE_NAME_RESOLVE('reviewing', 'archive')}### Step 2: Run verification checks

Run all these checks yourself — no sub-agent needed:

**All changes (lightweight + full):**
- Run \`npx tsc --noEmit\` — must pass
- Run \`npx vitest run\` — must pass

**Full changes additionally:**
- Verify each delta-spec SHALL/MUST has a passing test (grep specs/ for requirements, match against tests)
- Verify TDD commit integrity: RED→GREEN→REFACTOR sequence for each type:behavior task

**Write verification.md:**
Get template: \`bp template verification\`, fill with results.
- Status: \`passed\` if all checks pass, \`gaps_found\` if any fail, \`human_needed\` if ambiguous

### Step 3: Handle verification results
- \`passed\` → proceed to archival (Step 4)
- \`gaps_found\` → route back to apply (reapply) or plan (replan) — do NOT archive
- \`human_needed\` → surface to user with specific questions

### Step 4: Execute archival
Run \`bp archive bp/changes/<change-name>\` (or \`bp archive bp/milestones/<mid>/phases/<pid>/changes/<name>\` for phase changes).

This single CLI command handles: delta-spec merge, code cognition backfill, directory move to archive/, state.md update.

### Step 5: Understand what the CLI did (do NOT undo this)
\`bp archive\` has already updated \`state.md\` — the change is intentionally removed from the active list. This is correct, not a bug:

1. **Change removed from \`changes[]\` / \`adhoc[]\`** — it's no longer pending, this is expected
2. **Phase changes get a history entry** in \`## History\` section: \`[date] Archived ch-name (milestone / phase)\`
3. **\`active_context\` auto-reset** to the next pending change, or to project level if none remain
4. **Change directory moved** to \`bp/archive/<milestone>/<phase>/<change>/\` (phase) or \`bp/archive/changes/<date>-<name>/\` (adhoc)

**Do NOT write the change back into \`state.md\`** — the removal is the intended archival behavior.

After \`bp archive\` merges delta-specs into global specs:
- Verify merged global spec has no duplicate Requirement headers
- Verify all ADDED Requirements from delta exist in merged spec
- Verify all REMOVED Requirements from delta are gone from merged spec

${COMMIT_ADVANCE('docs', 'verify + archive <change-name>')}

### Step 7: Check if last change — generate phase summary
Run \`bp state\` and check the \`pending\` list. If no more pending changes remain in this phase:
1. Get the summary template: \`bp template summary\`
2. Collect all archived changes from \`bp/archive/<milestone>/<phase>/\`
3. Write \`bp/milestones/<mid>/phases/<pid>/summary.md\` containing:
   - Verification matrix (all changes with spec/quality/goal review status)
   - Each change's key deliverables and decisions from change-summary.md
   - Review verdicts
4. Commit the summary:
   \`\`\`bash
   bp commit "docs(summary): phase complete for <phase-id>" --files "bp/milestones/<mid>/phases/<pid>/summary.md" --scope docs --record
   \`\`\`

### Step 8: Advance
Run \`bp continue\` — if all phase changes are archived, routes to ship-phase.

## Guardrails
- No sub-agent — run checks yourself, then archive
- Full changes: verify delta-spec SHALL/MUST coverage and TDD commit integrity before archival
- Test suite must pass completely — never archive a failing change
- Delta-spec merge must resolve conflicts, not overwrite
- Archived changes are never deleted
- **Last change in phase**: write summary.md before advancing — this is the handoff artifact for the next phase`;

export function getArchiveSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-archive',
    description: 'Verify & archive — run checks, then delta-spec merge + directory move + state update',
    instructions,
  };
}

export function getArchiveCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Archive',
    description: 'Verify & archive — run checks, then delta-spec merge + directory move + state update',
    category: 'Workflow',
    tags: ['bp', 'archive', 'verify', 'specs', 'merge'],
    content: instructions,
  };
}
