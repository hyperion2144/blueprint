import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to implement. Provided by \`specwf continue\` output or user.
- If no change name is available, check the \`pending\` array from \`specwf context <step>\` JSON output, then ask the user which to work on.

### Prerequisites
- Plan phase complete: \`design.md\`, \`tasks.md\`, delta-specs ready

## Steps

### Step 1: Resolve change name and get context
Run \`specwf context apply\` — outputs JSON with state (including pending changes) and file manifest. If a change name was provided, use it directly. If not, read the \`pending\` array from the JSON, filter by status \`planning\`, and ask the user to pick. Then read all files listed in \`specs\`, \`conventions\`, and \`artifacts\`.

### Step 2: Dispatch executor sub-agent
**You are the orchestrator — dispatch, do not implement yourself.** Run \`specwf dispatch executor --change <change-name>\` for platform-specific dispatch instructions.

Construct the sub-agent prompt:
- Change: <change-name> in specwf/changes/<change-name>/
- Task: implement all tasks in tasks.md following TDD protocol
- Read: design.md, delta-specs
- Output: code changes, tests, completion.md

The sub-agent's system prompt (.omp/agents/specwf-executor.md) contains detailed TDD protocol.

### Step 3: Verify output and completion report
After the executor finishes, check \`completion.md\` exists and confirm:
- All tasks.md checkboxes checked
- Type check passes (\`tsc --noEmit\`)
- All tests pass (\`vitest run\`)
- Each delta-spec SHALL/MUST has test coverage

### Step 4: Generate change summary
Run \`specwf template change-summary --name <change-name> --dir specwf/changes/<change-name>\`, then fill it with actual details. Do NOT skip — the summary is the handoff artifact for review.

### Step 5: Pre-advance checklist
- [ ] All wave tasks complete
- [ ] Type check passes
- [ ] All tests pass
- [ ] Change summary written and filled (not template)
- [ ] completion.md from executor exists and verified

### Step 6: Advance
Run \`specwf continue\` to proceed to review.

## Guardrails
- **You are the orchestrator** — dispatch specwf-executor, never implement yourself
- GREEN phase writes ONLY enough code to pass — save refactoring for REFACTOR
- Never skip RED — always write the failing test first
- **Summary is mandatory**: advancing without a filled change-summary.md is a process violation`;

export function getApplySkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-apply',
    description: 'Code implementation — dispatch executor sub-agent for TDD RED->GREEN->REFACTOR',
    instructions,
  };
}

export function getApplyCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Apply',
    description: 'Code implementation — dispatch executor sub-agent for TDD RED->GREEN->REFACTOR',
    category: 'Workflow',
    tags: ['specwf', 'apply', 'implementation', 'tdd', 'sub-agent'],
    content: instructions,
  };
}
