import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input
- \`specwf/requirements.md\` must be complete (grill phase done)
- \`specwf/project.yml\` for technical constraints

## Steps

### Step 1: Check state and get context
Run \`specwf context research\` — outputs JSON with state and file manifest. Read all listed files before proceeding.

### Step 2: Dispatch research sub-agents
**You are the orchestrator — dispatch, do not research yourself.** Spawn \`specwf-researcher\` sub-agents in parallel, one per technical direction (stack, architecture, pitfalls).

Construct each sub-agent prompt:

\`\`\`text
Sub-agent: specwf-researcher
Task: Research <direction> for project <project-name>

[Context]
- Read requirements.md from specwf/requirements.md
- Extract constraints from specwf/project.yml
- Research scope: <stack | architecture | pitfalls>

[Responsibilities]
- Compare at least 2 candidate solutions
- Assess feasibility, risk, and trade-offs
- Produce a recommended approach with rationale
- Output to specwf/research/<stack.md | architecture.md | pitfalls.md>

[Constraints]
- Read-only — do not modify code or config
- Mark speculative findings with confidence levels
\`\`\`

### Step 3: Verify sub-agent output
After all sub-agents complete, verify:
- \`research/stack.md\` exists with tech stack comparison and recommendation
- \`research/architecture.md\` exists with architecture evaluation
- \`research/pitfalls.md\` exists with risk assessment
- Write \`research/summary.md\` synthesizing all findings into one recommendation

### Step 4: Advance
Run \`specwf continue\` to proceed to roadmap definition.

## Output
- \`research/stack.md\` — recommended tech stack with alternatives compared
- \`research/architecture.md\` — recommended architecture with rationale
- \`research/pitfalls.md\` — known risks and mitigation strategies
- \`research/summary.md\` — consolidated research conclusion

## Guardrails
- **You are the orchestrator** — dispatch sub-agents, do not research yourself
- Each sub-agent must compare at least 2 alternatives — never recommend the first option found
- Sub-agents are independent and run in parallel
- Mark speculative findings with confidence levels`;

export function getResearchSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-research',
    description: 'Project-level technical research — dispatch researcher sub-agents in parallel',
    instructions,
  };
}

export function getResearchCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Research',
    description: 'Project-level technical research — dispatch researcher sub-agents in parallel',
    category: 'Discovery',
    tags: ['specwf', 'research', 'architecture', 'tech-stack', 'sub-agent'],
    content: instructions,
  };
}
