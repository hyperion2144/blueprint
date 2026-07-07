import { ORCHESTRATOR_RULE } from '../types.js';
import { RESOLVE_PATHS, CHANGE_NAME_RESOLVE, WAVE_SPLIT, COMMIT_ADVANCE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`$ARGUMENTS\`** (required) — the change to fix. Entered via \`bp continue change <name> --command reapply\` or after fix-plan.

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

**Dispatch executor sub-agents in fix mode. Do NOT implement fixes yourself:**

For each wave in the current round:
1. Run \`bp dispatch executor --change $1\` — outputs the sub-agent tool and its parameters.
2. Call the tool it specifies. Set the sub-agent's prompt to **fix mode**:
   - Change: $1 (path from resolve step)
   - Mode: FIX — this wave addresses review findings
   - Wave: <Wave N> — implement ALL fix tasks in this wave
   - Tasks: <full task list from review-task.md with ids, types, referenced review findings>
   - Read: review-task.md (this wave only), spec-review.md, quality-review.md, goal-review.md (for finding context), design.md (original design), bp/conventions/coding-standards.md
   - Implement fixes in dependency order
   - Each task addresses a specific review finding — ensure the fix resolves it
   - After each task: run affected tests to verify, then:
     \`bp commit "fix(<scope>): <description>" --files <changed-files> --task <id> --tasks-path <review-task.md path> --record\`
   - Do NOT modify the original review files
3. For concurrent waves in the same round: dispatch ALL in one task tool call (parallel).
4. Wait for ALL wave sub-agents in this round to finish before verifying.

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

${COMMIT_ADVANCE('fix', 'fix-apply complete for [BP:CHANGE_NAME]')}

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
