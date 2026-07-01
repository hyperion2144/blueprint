import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

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
Read \`proposal.md\` to determine change type. Check \`tasks.md\` if it already exists:
- **Lightweight**: all tasks are type: config | docs | refactor | scaffolding — no type:behavior
- **Full**: any type:behavior tasks, OR new feature with architectural decisions

### Step 1: Resolve change name and get context
If a change name was provided: use it directly. If not: run \`bp state\`, list pending changes with status \`planned\` or \`proposal\`, ask the user to pick. Then run \`bp context plan\` to get the file manifest. Read all listed files.

### Step 2: Execute design

**If LIGHTWEIGHT — design directly (skip sub-agent):**

The change has no type:behavior tasks — you design and implement yourself without dispatching a planner sub-agent.

**What to produce:**
1. Get template: \`bp template design\` → write \`design.md\` (1-2 paragraphs of approach, no alternatives needed)
2. Get template: \`bp template tasks\` → write \`tasks.md\` (list each task with type: config|docs|refactor|scaffolding)
3. Skip delta-specs — not needed for non-behavioral changes
4. Skip proposal review — proposal.md is optional for lightweight changes (can be a one-liner)

**After writing files:**
- Mark all task checkboxes as done in \`tasks.md\`
- Append \`## Completion\` section to \`tasks.md\` confirming all tasks complete
- Run \`bp continue\` to proceed to apply

**If FULL — dispatch planner sub-agent:**
Run \`bp dispatch planner --change <change-name>\` for platform-specific dispatch instructions.

Construct the sub-agent prompt:
- Task: produce design.md, tasks.md, and delta-specs for this change
- Read: bp/changes/<change-name>/proposal.md, context.md, related specs/, conventions/
- Output: design.md, tasks.md, specs/<domain>/spec.md
- The sub-agent's system prompt (.omp/agents/bp-planner.md) contains detailed instructions.

### Step 3: Verify output
After the planner finishes, check that \`tasks.md\` has all boxes checked and contains a \`## Completion\` section, and confirm:
- \\\`design.md\\\` — architecture, data flow, alternatives
- \\\`tasks.md\\\` — type annotations, TDD triples, wave grouping
- \\\`specs/<domain>/spec.md\\\` — SHALL/MUST with scenarios
- All must_haves from proposal.md covered
- No contradictions with context.md

### Step 4: Advance
Run \\\`bp continue\\\` to proceed to the apply phase.

## Output
- \\\`design.md\\\` — technical design document
- \\\`tasks.md\\\` — implementation task checklist
- \\\`specs/<domain>/spec.md\\\` — delta-specs
- \\\`completion.md\\\` — sub-agent completion report

## Guardrails
- **You are the orchestrator** — dispatch for full changes, design directly for lightweight
- type:behavior tasks MUST have RED->GREEN->REFACTOR triples
- Delta-specs describe behavior, not implementation details — skip for lightweight
- If a change is too large to split into clear tasks, return to split phase`;

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
