import { CLASSIFY_CHANGE, CHANGE_NAME_RESOLVE, COMMIT_ADVANCE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

### Parameters
- **\\\`<change-name>\\\`** (required) — the change to verify. Provided by \\\`bp continue\\\` output or user.

### Prerequisites
- Review phase complete: spec-review.md, quality-review.md, goal-review.md
- All review blockers resolved

## Steps

${CLASSIFY_CHANGE}${CHANGE_NAME_RESOLVE('reviewing', 'verify')}### Step 2: Execute verification

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

### Step 3: Handle results
- \`passed\` → advance to archive
- \`gaps_found\` → route back to apply (reapply) or plan (replan)
- \`human_needed\` → surface to user with specific questions

${COMMIT_ADVANCE('docs', 'verification complete for <change-name>')}

## Guardrails
- No sub-agent — run checks yourself and write verification.md
- Full changes: verify delta-spec SHALL/MUST coverage and TDD commit integrity
- Test suite must pass completely`;

export function getVerifySkillTemplate(): SkillTemplate {
  return {
    name: 'bp-verify',
    description: 'Test verification — run checks, write verification.md, route loopback',
    instructions,
  };
}

export function getVerifyCommandTemplate(): CommandTemplate {
  return {
    name: 'BP: Verify',
    description: 'Test verification — run checks, write verification.md, route loopback',
    category: 'Workflow',
    tags: ['bp', 'verify', 'testing', 'verification'],
    content: instructions,
  };
}
