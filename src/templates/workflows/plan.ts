import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\\\`<change-name>\\\`** (required) — the change to plan. Provided by \\\`bp continue\\\` output or user.
- If no change name is available, check the \\\`pending\\\` array from \\\`bp context <step>\\\` JSON output, then ask the user which to work on.

### Prerequisites
- Change \`proposal.md\` must be confirmed (not template)
- \`bp/milestones/<mid>/phases/<pid>/context.md\` — phase decisions (get milestone/phase IDs from \`bp state\`)
- Related \`specs/\` and \`conventions/\` files

## Steps

### Step 0: Resolve paths
Run \`bp state\` to get \`milestone\` and \`phase\`. Construct the change base path:
\`\`\`text
bp/milestones/<milestone>/phases/<phase>/changes/<change-name>/
\`\`\`

### Step 1: Classify change
Read \`proposal.md\`. Read \`tasks.md\` if it exists. Classify:
- **Lightweight**: all tasks are type: config | docs | refactor | scaffolding — no type:behavior
- **Full**: any type:behavior tasks, OR new feature with architectural decisions

### Step 2: Resolve change name and get context
If a change name was provided: use it directly. If not: run \`bp state\`, list pending changes with status \`planning\`, ask the user to pick. Then run \`bp context plan\` to get the file manifest. Read all listed files.

### Step 3: Execute design

**If LIGHTWEIGHT:**

1. Run \`bp template design\`, fill approach (1-2 paragraphs), write \`design.md\`
2. Run \`bp template tasks\`, list tasks with type annotations, write \`tasks.md\`
3. Skip delta-specs (not needed for non-behavioral changes)
4. **Leave all task boxes UNCHECKED** — apply phase marks them done after implementation
5. Run \`bp continue\`

**If FULL — you MUST dispatch the planner sub-agent. Do NOT write design/tasks/specs yourself:**

Run \`bp dispatch planner --change <change-name>\`. Construct the sub-agent prompt:
- Task: produce design.md, tasks.md (boxes UNCHECKED), specs/<domain>/spec.md
- Read: proposal.md, context.md, specs/, conventions/
- Output: design.md, tasks.md, specs/<domain>/spec.md
- The sub-agent's system prompt (.omp/agents/bp-planner.md) contains detailed instructions.

### Step 4: Verify output
Check produced files:
- \`design.md\` — architecture, data flow, approach
- \`tasks.md\` — type annotations, RED triples, wave grouping; **boxes must be UNCHECKED** (apply marks them)
- \`specs/<domain>/spec.md\` — must have ≥1 non-template SHALL/MUST (reject if all \`<name>\`/\`<behavior>\` placeholders)
- All must_haves from proposal.md covered
- No contradictions with context.md

### Step 5: Advance
Run \`bp continue\` to proceed to the apply phase.

## Output
- \`design.md\` — technical design document
- \`tasks.md\` — implementation task checklist
- \`specs/<domain>/spec.md\` — delta-specs
- \`completion.md\` — sub-agent completion report

## Guardrails
- FULL: MUST dispatch planner sub-agent; do NOT write design/tasks/specs yourself
- type:behavior tasks need RED→GREEN→REFACTOR triples
- Delta-specs for behavior, not implementation — skip for LIGHTWEIGHT
- tasks.md stays UNCHECKED after plan — apply marks each done
- Too large to split? Return to split phase`;

export function getPlanSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-plan',
    description: 'Change design — dispatch planner sub-agent for design + tasks + delta-specs',
    instructions,
  };
}

export function getPlanCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Plan',
    description: 'Change design — dispatch planner sub-agent for design + tasks + delta-specs',
    category: 'Workflow',
    tags: ['bp', 'plan', 'design', 'tasks', 'delta-specs', 'sub-agent'],
    content: instructions,
  };
}
