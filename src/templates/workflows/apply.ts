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

**If LIGHTWEIGHT** — implement tasks yourself, one by one. After each: verify with \`npx vitest run <test-file>\`, then commit (auto-marks \`[x]\` + commit hash):
\`\`\`bash
bp commit "<type>(<scope>): <description>" --files "<changed-files>" --task <id> --tasks-path [BP:CHANGE_DIR]tasks.md --record
\`\`\`

**If FULL — dispatch executor sub-agents. Do NOT implement type:behavior tasks yourself:**

For each wave in the current round:
1. Run \`bp dispatch executor --change $1\` — outputs the sub-agent tool, its parameters, and isolation information.
2. **Check the isolation type from the dispatch output:**

   **If \`isolation.type=param\`** (OMP, Claude Code):
   - Pass the isolation field to the spawn tool:
     - OMP (\`task\` tool): add \`isolated: true\` to the task item
     - Claude Code (\`agent\` tool): add \`worktree: exec-$1-wave<N>\` to the agent call
   - The platform automatically creates an isolated worktree; no manual setup needed.

   **If \`isolation.type=none\`** (generic agent platform):
   - Create a dedicated git worktree before spawning:
     \`\`\`bash
     git worktree add ../exec-$1-wave<N> -b exec-$1-wave<N>
     \`\`\`
   - Include \`cd ../exec-$1-wave<N>\` at the start of the sub-agent's prompt so all work happens in the worktree.
   - After the sub-agent finishes:
     \`\`\`bash
     git merge exec-$1-wave<N> --ff-only
     git branch -d exec-$1-wave<N>
     git worktree remove ../exec-$1-wave<N>
     \`\`\`

3. Call the tool it specifies. Set the sub-agent's prompt to:
   - Change: $1 (path from resolve step)
   - Wave: <Wave N: theme> — implement ALL tasks in this wave
   - Tasks: <full task list for this wave with ids, types, descriptions, files, acceptance, RED tests>
   - Read: design.md, tasks.md (this wave only), delta-specs referenced by spec_ref fields, bp/conventions/coding-standards.md
   - For type:behavior: RED test first → GREEN → REFACTOR
   - After each task: run \`npx vitest run <test-file>\` to verify, then:
     \`bp commit "<type>(<scope>): <description>" --files <changed-files> --task <id> --tasks-path <tasks.md path> --record\`
   - Do NOT touch tasks outside this wave
   - Return when all tasks in this wave are implemented and committed
4. For concurrent waves in the same round: run \`bp dispatch executor\` once per wave, dispatch ALL in one task tool call (parallel). Each wave gets its own isolation.
5. Wait for ALL wave sub-agents in this round to finish before proceeding to verify.

### Step: Verify each sub-agent's output

**After each wave finishes, verify the sub-agent actually implemented what it promised:**

For each task in the completed wave:
- **Check git log**: \`git log --oneline -5\` — confirm new commits exist with commit hashes.
- **Check git diff**: \`git diff --stat HEAD~<N>\` — confirm files were actually changed (not just a no-op).
- **Check tasks.md marking**: read \`[BP:CHANGE_DIR]tasks.md\` — confirm task \`[x]\` is checked AND \`<!-- commit: HASH -->\` annotation exists next to the task.
- **Run task's tests**: \`npx vitest run <test-file>\` (from task's \`files\` field) — must pass.
- **If lightweight** (you implemented tasks yourself): same checks — confirm your commits actually landed.

Any task missing \`<!-- commit: -->\` annotation → re-run \`bp commit\` for that task manually:
\`\`\`bash
bp commit "<type>(<scope>): <description>" --files <changed-files> --task <id> --tasks-path [BP:CHANGE_DIR]tasks.md --record
\`\`\`

Any task with failing tests → re-dispatch the wave with failure details.

After all tasks in the wave pass verification, proceed to round verify.

### Step: Final implementation verify and change summary

After ALL waves complete and all tests pass:
- Run \`bp template change-summary --stdout\` to read the template, then write to \`[BP:CHANGE_DIR]change-summary.md\` using the Write tool. Fill with actual details.
- Ensure all tasks.md checkboxes are \`[x]\`

**CRITICAL: Implementation verification is NOT review.** After this step, run \`bp continue\` — it will advance to the review step. NEVER skip review and go directly to archive.

${COMMIT_ADVANCE('docs', 'apply complete for $1')}

## Guardrails
- Each wave = ONE sub-agent; dispatch concurrent waves in one task tool call
- Sub-agents implement and commit; main agent verifies
- **After each wave: verify git log, tasks.md marking (\`[x]\` + \`<!-- commit: -->\`), and test pass** — no-op or incomplete tasks are treated as failures
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
