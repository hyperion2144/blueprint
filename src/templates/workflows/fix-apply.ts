import { ORCHESTRATOR_RULE } from '../types.js';
import { RESOLVE_PATHS, CHANGE_NAME_RESOLVE, WAVE_SPLIT, COMMIT_ADVANCE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to fix. Entered via \`bp continue change <name> --command reapply\` or after fix-plan.

### Prerequisites
- review-task.md exists with fix tasks organized by wave
- Original review files (spec-review.md, quality-review.md, goal-review.md) exist for context

## Steps

${RESOLVE_PATHS}${CHANGE_NAME_RESOLVE('fix-applying', 'fix-apply')}

### Step 3: Read review context

Read \`review-task.md\` — each task maps to a review finding.
Read the three review files to understand what findings need fixing.

### Step 4: Wave analysis and dispatch

${WAVE_SPLIT}

**For executor sub-agents, set prompt to fix mode**:
- This is a FIX wave — implement fixes for review findings
- Read review-task.md for your wave's tasks
- Read spec-review.md, quality-review.md, goal-review.md for finding context
- Each task addresses a specific review finding
- Implement fixes, commit with \`bp commit --task <id> --tasks-path <review-task.md path>\`
- Do NOT modify the original review files
- Do NOT run tsc or vitest

### Step 5: Verify after each round

After ALL waves in a round complete:
\`\`\`bash
npx tsc --noEmit
npx vitest run
\`\`\`

If pass: mark tasks \`[x]\` in review-task.md.
If fail: re-dispatch failing wave with error details.

### Step 6: Final verify

After all waves complete and all tests pass, verify:
- Each BLOCKER finding is addressed by at least one committed fix
- No regressions in unaffected code

${COMMIT_ADVANCE('fix', 'fix-apply complete for <change-name>')}

## Guardrails
- Executor runs in FIX MODE — reads review files for context, implements fixes per review-task.md
- Same wave-based dispatch as apply, source is review-task.md
- Advance routes to review (--fix) automatically
- If fixes incomplete → BLOCKERs remain in next review → loop back`;

export function getFixApplySkillTemplate(): SkillTemplate {
  return {
    name: 'bp-fix-apply',
    description: 'Fix implementation — wave-based dispatch of executor sub-agents for review findings',
    instructions,
  };
}

export function getFixApplyCommandTemplate(): CommandTemplate {
  return {
    description: 'Fix implementation — wave-based dispatch of executor sub-agents for review findings',
    category: 'Workflow',
    tags: ['bp', 'fix-apply', 'implementation', 'review', 'loopback', 'sub-agent', 'waves'],
    content: instructions,
  };
}
