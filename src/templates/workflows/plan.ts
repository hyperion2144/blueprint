import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\\\`<change-name>\\\`** (required) — the change to plan. Provided by \\\`specwf continue\\\` output or user.
- If no change name is available, check the \\\`pending\\\` array from \\\`specwf context <step>\\\` JSON output, then ask the user which to work on.

### Prerequisites
- Change \\\`proposal.md\\\` must be confirmed (not template)
- \\\`context.md\\\` — phase-level implementation decisions (for phase changes)
- Related \\\`specs/\\\` and \\\`conventions/\\\` files

## Steps

### Step 1: Resolve change name and get context
If a change name was provided: use it directly. If not: run \\\`specwf state\\\`, list pending changes with status \\\`planned\\\` or \\\`proposal\\\`, ask the user to pick. Then run \\\`specwf context plan\\\` to get the file manifest. Read all listed files.

### Step 2: Dispatch planner sub-agent
**You are the orchestrator — dispatch, do not design yourself.** Run \\\`specwf dispatch planner --change <change-name>\\\` for platform-specific dispatch instructions.

Construct the sub-agent prompt:
- Task: produce design.md, tasks.md, and delta-specs for this change
- Read: specwf/changes/<change-name>/proposal.md, context.md, related specs/, conventions/
- Output: design.md, tasks.md, specs/<domain>/spec.md, completion.md
- The sub-agent's system prompt (.omp/agents/specwf-planner.md) contains detailed instructions — specify task and parameters only.

### Step 3: Verify output and completion report
After the planner finishes, check that \\\`completion.md\\\` exists and confirm:
- \\\`design.md\\\` — architecture, data flow, alternatives
- \\\`tasks.md\\\` — type annotations, TDD triples, wave grouping
- \\\`specs/<domain>/spec.md\\\` — SHALL/MUST with scenarios
- All must_haves from proposal.md covered
- No contradictions with context.md

### Step 4: Advance
Run \\\`specwf continue\\\` to proceed to the apply phase.

## Output
- \\\`design.md\\\` — technical design document
- \\\`tasks.md\\\` — implementation task checklist
- \\\`specs/<domain>/spec.md\\\` — delta-specs
- \\\`completion.md\\\` — sub-agent completion report

## Guardrails
- **You are the orchestrator** — dispatch specwf-planner, do not design yourself
- type:behavior tasks MUST have RED->GREEN->REFACTOR triples
- Delta-specs describe behavior, not implementation details
- If a change is too large to split into clear tasks, return to split phase`;

export function getPlanSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-plan',
    description: 'Change design — dispatch planner sub-agent for design + tasks + delta-specs',
    instructions,
  };
}

export function getPlanCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Plan',
    description: 'Change design — dispatch planner sub-agent for design + tasks + delta-specs',
    category: 'Workflow',
    tags: ['specwf', 'plan', 'design', 'tasks', 'delta-specs', 'sub-agent'],
    content: instructions,
  };
}
