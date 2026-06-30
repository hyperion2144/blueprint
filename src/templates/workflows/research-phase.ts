import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input
- \`context.md\` must exist (discuss phase done)
- Related specs, conventions, and external dependencies

## Steps

### Step 1: Check state and get context
Run \`specwf context research-phase\` — outputs JSON with state and file manifest. Read all listed files before proceeding.

### Step 2: Dispatch phase researcher
**You are the orchestrator — dispatch, do not research yourself.** Run \`specwf dispatch phase-researcher\` for platform-specific dispatch instructions.

Construct the sub-agent prompt:
- Task: research implementation paths for this phase
- Read: context.md, related specs/, conventions/
- Output: research.md with recommended paths and TDD implications
- The sub-agent's system prompt (.omp/agents/specwf-phase-researcher.md) contains detailed research protocol.

### Step 3: Verify output
Confirm \`research.md\` was written by the sub-agent with:
- Recommended implementation paths with rationale
- Known pitfalls and edge cases
- TDD implications annotated

### Step 4: Advance
Run \`specwf continue\` to proceed to the split phase.

## Output
- \`research.md\` — phase-level implementation research with recommended paths and known pitfalls

## Guardrails
- **You are the orchestrator** — dispatch the sub-agent, do not research yourself
- Research must respect context.md locked decisions
- Surface trade-offs explicitly`;

export function getResearchPhaseSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-research-phase',
    description: 'Phase research — dispatch phase-researcher sub-agent',
    instructions,
  };
}

export function getResearchPhaseCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Research Phase',
    description: 'Phase research — dispatch phase-researcher sub-agent',
    category: 'Discovery',
    tags: ['specwf', 'research-phase', 'implementation', 'sub-agent'],
    content: instructions,
  };
}
