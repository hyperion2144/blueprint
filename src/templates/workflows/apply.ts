import { ORCHESTRATOR_RULE } from '../types.js';
import { RESOLVE_PATHS, CLASSIFY_CHANGE, CHANGE_NAME_RESOLVE, COMMIT_ADVANCE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to implement. Provided by \`bp continue\` output or user.

### Prerequisites
- Plan phase complete: \`design.md\`, \`tasks.md\`, delta-specs ready

## Steps

${RESOLVE_PATHS}${CLASSIFY_CHANGE}${CHANGE_NAME_RESOLVE('planning', 'apply')}### Step 3: Execute implementation

**If LIGHTWEIGHT — implement task by task:**

For each task in \`tasks.md\` (in wave order):
1. Implement the change
2. Verify: run applicable checks (\`tsc --noEmit\` / \`vitest run\`)
3. Mark that task \`[x]\` — only AFTER verification passes
4. Commit with \`bp commit\`:
   \`\`\`bash
   bp commit "feat(core): implement move validation" \\
     --files "src/core/move.ts,tests/unit/move.test.ts" \\
     --scope core --task task-1.3 \\
     --tasks-path "bp/milestones/<mid>/phases/<pid>/changes/<name>/tasks.md"
   \`\`\`
   \`--task <id>\` writes \`<!-- commit: <hash> -->\` next to that task in \`tasks.md\`.
   If \`commitDocs: false\` in project.yml, doc files are auto-skipped.

After ALL tasks pass verification:
- Append \`## Completion\` section to \`tasks.md\` summarizing results

**If FULL — you MUST dispatch the executor sub-agent. Do NOT implement type:behavior tasks yourself:**

1. Run \`bp dispatch executor --change <change-name>\` — outputs the sub-agent tool and its parameters.
2. Call the tool it specifies. Set the sub-agent's prompt to:
   - Change: <change-name> (path from Step 0)
   - Task: implement all tasks in tasks.md following TDD protocol (RED→GREEN→REFACTOR)
   - Read: requirements.md, roadmap.md (this phase), research.md, design.md, delta-specs, bp/specs/<domain>/spec.md (global spec — domain = directory under bp/specs/), bp/conventions/coding-standards.md
   - Read delta-specs BEFORE implementing — each task must satisfy its referenced Requirements
   - If implementation reveals a spec is wrong, annotate as SPEC_MISMATCH (don't silently deviate)
   - Output: code, tests, tasks.md (boxes checked after each task passes)
   - The executor analyzes depends_on in tasks.md: independent tasks run in parallel (spawned child executors), dependent tasks run sequentially
   - Each task: bp commit --task <id> --tasks-path ... after completion

### Step 4: Verify output and completion report
After execution:
- All tasks.md checkboxes checked
- Type check passes (\`tsc --noEmit\`)
- All tests pass (\`vitest run\`)
- Each delta-spec SHALL/MUST has test coverage

### Step 5: Generate change summary
Run \`bp template change-summary --dir <change-dir>\`, fill with actual details. Do NOT skip.

${COMMIT_ADVANCE('docs', 'apply complete for <change-name>')}

## Guardrails
- LIGHTWEIGHT: implement task-by-task, mark \`[x]\` after verify — never all at once
- LIGHTWEIGHT: every task commit MUST use \`bp commit --task <id>\` to record hash in \`tasks.md\`
- FULL: MUST dispatch executor sub-agent; RED→GREEN→REFACTOR enforced
- Summary mandatory: no advance without filled change-summary.md`;

export function getApplySkillTemplate(): SkillTemplate {
  return {
    name: 'bp-apply',
    description: 'Code implementation — dispatch executor sub-agent for TDD RED→GREEN→REFACTOR',
    instructions,
  };
}

export function getApplyCommandTemplate(): CommandTemplate {
  return {
    name: 'BP: Apply',
    description: 'Code implementation — dispatch executor sub-agent for TDD RED→GREEN→REFACTOR',
    category: 'Workflow',
    tags: ['bp', 'apply', 'implementation', 'tdd', 'sub-agent'],
    content: instructions,
  };
}
