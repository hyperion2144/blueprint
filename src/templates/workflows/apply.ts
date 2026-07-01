import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

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
Read \`tasks.md\` and check the task types:
- **Lightweight**: ALL tasks are type: config | docs | refactor | scaffolding — no type:behavior
- **Full**: any type:behavior tasks

### Step 1: Resolve change name and get context
Run \`bp context apply\` — outputs JSON with state (including pending changes) and file manifest. If a change name was provided, use it directly. If not, read the \`pending\` array from the JSON, filter by status \`planning\`, and ask the user to pick. Then read all files listed in \`specs\`, \`conventions\`, and \`artifacts\`.

### Step 2: Execute implementation

**If LIGHTWEIGHT — implement directly (skip sub-agent):**
- No TDD protocol required — implement changes directly
- Commit format: \`config|docs|refactor|chore(<scope>): <description>\`
- Write \`completion.md\` confirming all tasks done
- Run \`npx vitest run\` and \`npx tsc --noEmit\` to verify

**If FULL — dispatch executor sub-agent:**
Run \`bp dispatch executor --change <change-name>\` for platform-specific dispatch instructions.

Construct the sub-agent prompt:
- Change: <change-name> in the change directory (from Step 0)
- Task: implement all tasks in tasks.md following TDD protocol
- Read: design.md, delta-specs
- Output: code changes, tests, completion.md

The sub-agent's system prompt (.omp/agents/bp-executor.md) contains detailed TDD protocol.

### Step 3: Verify output and completion report
After the executor finishes, check \`completion.md\` exists and confirm:
- All tasks.md checkboxes checked
- Type check passes (\`tsc --noEmit\`)
- All tests pass (\`vitest run\`)
- Each delta-spec SHALL/MUST has test coverage

### Step 4: Generate change summary
Run \`bp template change-summary --dir <change-dir>\`, then fill it with actual details. Do NOT skip — the summary is the handoff artifact for review.

### Step 5: Pre-advance checklist
- [ ] All wave tasks complete
- [ ] Type check passes
- [ ] All tests pass
- [ ] Change summary written and filled (not template)
- [ ] completion.md from executor exists and verified

### Step 6: Advance
Run \`bp continue\` to proceed to review.

## Guardrails
- **You are the orchestrator** — dispatch for full changes, implement directly for lightweight
- Full: GREEN phase writes ONLY enough code to pass — save refactoring for REFACTOR
- Full: Never skip RED — always write the failing test first
- Lightweight: single commit per file type, no TDD ceremony
- **Summary is mandatory**: advancing without a filled change-summary.md is a process violation`;

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
