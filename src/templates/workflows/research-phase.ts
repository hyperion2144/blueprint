import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input
- \`context.md\` must exist (discuss phase done)
- Related specs, conventions, and external dependencies

## Steps

### Step 1: Check state and get context
Run \`specwf context research-phase\` — outputs JSON with state and file manifest. Read all listed files before proceeding.

### Step 1: Dispatch phase researcher
**You are the orchestrator — dispatch, do not research yourself.** Spawn \`specwf-phase-researcher\` sub-agent.

Construct the sub-agent prompt:

\`\`\`text
Sub-agent: specwf-phase-researcher
Task: Research implementation paths for phase <phase-id>

[Context]
- Read context.md for locked decisions and discretion areas
- Read related specs/ for existing behavioral contracts
- Read conventions/ for coding standards

[Responsibilities]
- Investigate concrete implementation approaches
- Identify reusable patterns from existing codebase
- Flag known pitfalls and edge cases
- Produce research.md with recommended paths and TDD implications
- Output to milestones/<ms>/phases/<ph>/research.md

[Constraints]
- Respect context.md locked decisions — they are non-negotiable
- Surface trade-offs explicitly — do not present one option as the only path
- Note confidence levels for speculative findings
\`\`\`

### Step 2: Verify output
Confirm \`research.md\` was written by the sub-agent with:
- Recommended implementation paths with rationale
- Known pitfalls and edge cases
- TDD implications annotated

### Step 3: Advance
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
