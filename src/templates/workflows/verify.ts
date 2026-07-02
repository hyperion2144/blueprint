import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\\\`<change-name>\\\`** (required) — the change to verify. Provided by \\\`bp continue\\\` output or user.
- If no change name, check the \\\`pending\\\` array from \\\`bp context verify\\\` output, filter by status \\\`reviewing\\\`, ask the user.

### Prerequisites
- Review phase complete: spec-review.md, quality-review.md, goal-review.md
- All review blockers resolved

## Steps

### Step 0: Classify change
Read \`tasks.md\` and check task types:
- **Lightweight**: ALL tasks are type: config | docs | refactor | scaffolding — no type:behavior
- **Full**: any type:behavior tasks

### Step 1: Resolve change name and get context
Run \`bp context verify\` — outputs JSON with state and file manifest. If a change name was provided, use it directly. If not, read the \`pending\` array, filter by status \`reviewing\`, ask the user.

### Step 2: Execute verification

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

### Step 4: Commit
\`\`\`bash
bp commit "docs(verify): verification complete for <change-name>" --files "bp/.../<change-name>/verification.md" --scope docs --record
\`\`\`

### Step 5: Advance
Run \\\`bp continue\\\` to proceed to archive (if passed).

## Guardrails
- No sub-agent — run checks yourself and write verification.md
- Full changes: verify delta-spec SHALL/MUST coverage and TDD commit integrity
- Test suite must pass completely`;

export function getVerifySkillTemplate(): SkillTemplate {
  return {
    name: 'bp-verify',
    description: 'Test verification — goal-backward analysis + UAT, dispatch verifier sub-agent',
    instructions,
  };
}

export function getVerifyCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Verify',
    description: 'Test verification — goal-backward analysis + UAT, dispatch verifier sub-agent',
    category: 'Workflow',
    tags: ['bp', 'verify', 'testing', 'uat', 'sub-agent'],
    content: instructions,
  };
}
