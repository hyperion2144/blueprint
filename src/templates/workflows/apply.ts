import { ORCHESTRATOR_RULE } from '../types.js';
import { RESOLVE_PATHS, CLASSIFY_CHANGE, CHANGE_NAME_RESOLVE, WAVE_SPLIT, COMMIT_ADVANCE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`$ARGUMENTS\`** (required) — the change to implement. Provided by \`bp continue\` output or user.

### Prerequisites
- Plan phase complete: \`design.md\`, \`tasks.md\`, delta-specs ready

## Steps

${RESOLVE_PATHS}${CLASSIFY_CHANGE}${CHANGE_NAME_RESOLVE('planning', 'apply')}
${WAVE_SPLIT}
### Step: Dispatch executor per wave

**If LIGHTWEIGHT** — implement tasks yourself, one by one. After each: verify, mark \`[x]\`, then commit with changed files:
\`\`\`bash
bp commit "<type>(<scope>): <description>" --files "<changed-files>" --task <id> --tasks-path [BP:CHANGE_DIR]tasks.md --record
\`\`\`

**If FULL — dispatch executor sub-agents. Do NOT implement type:behavior tasks yourself:**

For each wave in the current round:
1. Run \`bp dispatch executor --change $1\` — outputs the sub-agent tool and its parameters.
2. Call the tool it specifies. Set the sub-agent's prompt to:
   - Change: $1 (path from resolve step)
   - Wave: <Wave N: theme> — implement ALL tasks in this wave
   - Tasks: <full task list for this wave with ids, types, descriptions, files, acceptance, RED tests>
   - Read: design.md, tasks.md (this wave only), delta-specs referenced by spec_ref fields, bp/conventions/coding-standards.md
   - For type:behavior: RED test first → GREEN → REFACTOR
   - After each task: run \`npx vitest run <test-file>\` to verify, then:
     \`bp commit "<type>(<scope>): <description>" --files <changed-files> --task <id> --tasks-path <tasks.md path> --record\`
   - Do NOT touch tasks outside this wave
   - Return when all tasks in this wave are implemented and committed
3. For concurrent waves in the same round: run \`bp dispatch executor\` once per wave, dispatch ALL in one task tool call (parallel).
4. Wait for ALL wave sub-agents in this round to finish before proceeding to verify.
### Step: Implementation verify after each round

**This verifies the code works — it is NOT the review step.** Review is a separate workflow step that runs after apply completes.

After ALL waves in a round complete, run verify:
\`\`\`bash
npx tsc --noEmit
npx vitest run
\`\`\`

If verify passes: mark all tasks in completed waves \`[x]\` in tasks.md, then proceed to next round.
If verify fails: route failing tests back to the wave that introduced them — re-dispatch that wave's sub-agent with the failure details.

### Step: Final implementation verify and change summary

After ALL waves complete and all tests pass:
- Run \`bp template change-summary --dir [BP:CHANGE_DIR]\`, fill with actual details.
- Ensure all tasks.md checkboxes are \`[x]\`

**CRITICAL: Implementation verification is NOT review.** After this step, run \`bp continue\` — it will advance to the review step. NEVER skip review and go directly to archive.

${COMMIT_ADVANCE('docs', 'apply complete for $1')}

## Guardrails
- Each wave = ONE sub-agent; dispatch concurrent waves in one task tool call
- Sub-agents implement and commit; main agent verifies
- NEVER skip implementation verify between rounds
- **NEVER skip review.** "Implementation Verification" in tasks.md confirms the code compiles and tests pass — it does NOT replace the review step (\`/bp:review\`). After apply, always run \`bp continue\` to advance to review.
- Summary mandatory: no advance without filled change-summary.md`;

export function getApplySkillTemplate(): SkillTemplate {
  return {
    name: 'bp-apply',
    description: 'Code implementation — wave-based dispatch of executor sub-agents',
    instructions,
  };
}

export function getApplyCommandTemplate(): CommandTemplate {
  return {
    description: 'Code implementation — wave-based dispatch of executor sub-agents',
    category: 'Workflow',
    tags: ['bp', 'apply', 'implementation', 'tdd', 'sub-agent', 'waves'],
    content: instructions,
  };
}
