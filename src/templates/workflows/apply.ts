import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to implement. Provided by \`bp continue\` output or user.
- If no change name is available, check the \`pending\` array from \`bp context <step>\` JSON output, then ask the user which to work on.

### Prerequisites
- Plan phase complete: \`design.md\`, \`tasks.md\`, delta-specs ready

## Steps

### Step 0: Resolve paths
Run \`bp state\` to get \`milestone\` and \`phase\`. Construct the change directory:
\`\`\`text
bp/milestones/<milestone>/phases/<phase>/changes/<change-name>/
\`\`\`
(Adhoc changes go under \`bp/changes/<name>/\`)

### Step 1: Classify change
Read \`tasks.md\` and check task types:
- **Lightweight**: ALL tasks are type: config | docs | refactor | scaffolding — no type:behavior
- **Full**: any type:behavior tasks

### Step 2: Resolve change name and get context
Run \`bp context apply\`. Read all listed files. If a change name was provided, use it directly. If not, read the \`pending\` array from the JSON, filter by status \`planning\`, and ask the user to pick.

### Step 3: Execute implementation

**If LIGHTWEIGHT — implement task by task:**

For each task in \`tasks.md\` (in wave order):
1. Implement the change
2. Verify: run applicable checks (\`tsc --noEmit\` / \`vitest run\`)
3. Mark that task \`[x]\` — only AFTER verification passes
4. Commit with \`bp commit\` and \`--task <task-id>\` to record hash:
   \`\`\`bash
   bp commit "config(scope): description" --files "path/to/file1,path/to/file2" --scope scope --task task-1.1
   \`\`\`
   The CLI writes \`<!-- commit: <hash> -->\` next to the task in \`tasks.md\`. If \`commitDocs: false\` in project.yml, doc files are auto-skipped.

After ALL tasks pass verification:
- Append \`## Completion\` section to \`tasks.md\` summarizing results

**If FULL — you MUST dispatch the executor sub-agent. Do NOT implement type:behavior tasks yourself:**

Run \`bp dispatch executor --change <change-name>\`. Construct the sub-agent prompt:
- Change: <change-name> (path from Step 0)
- Task: implement all tasks in tasks.md following TDD protocol (RED→GREEN→REFACTOR)
- Read: design.md, delta-specs
- Output: code, tests, tasks.md (boxes checked ONLY after each task's tests pass)
- The sub-agent's system prompt (.omp/agents/bp-executor.md) contains detailed TDD protocol.

### Step 4: Verify output and completion report
After execution:
- All tasks.md checkboxes checked
- Type check passes (\`tsc --noEmit\`)
- All tests pass (\`vitest run\`)
- Each delta-spec SHALL/MUST has test coverage

### Step 5: Generate change summary
Run \`bp template change-summary --dir <change-dir>\`, fill with actual details. Do NOT skip.

### Step 6: Pre-advance checklist
- [ ] All tasks done and marked \`[x]\` each with \`<!-- commit: <hash> -->\` recorded
- [ ] Type check passes
- [ ] All tests pass
- [ ] Change summary filled
- [ ] \`tasks.md\` fully checked
- [ ] All commits use \`bp commit\` (not raw \`git commit\`)

### Step 7: Advance
Run \`bp continue\` to proceed to review.

## Guardrails
- LIGHTWEIGHT: implement task-by-task, mark \`[x]\` after verify — never all at once
- LIGHTWEIGHT: every task commit MUST use \`bp commit --task <id>\` to record hash in \`tasks.md\`
- FULL: MUST dispatch executor sub-agent; RED→GREEN→REFACTOR enforced
- Summary mandatory: no advance without filled change-summary.md`;

export function getApplySkillTemplate(): SkillTemplate {
  return {
    name: 'bp-apply',
    description: 'Code implementation — dispatch executor sub-agent for TDD RED->GREEN->REFACTOR',
    instructions,
  };
}

export function getApplyCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Apply',
    description: 'Code implementation — dispatch executor sub-agent for TDD RED->GREEN->REFACTOR',
    category: 'Workflow',
    tags: ['bp', 'apply', 'implementation', 'tdd', 'sub-agent'],
    content: instructions,
  };
}
