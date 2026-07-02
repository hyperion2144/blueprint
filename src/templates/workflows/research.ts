import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input
- \`bp/requirements.md\` must be complete (grill phase done)
- \`bp/project.yml\` for technical constraints

## Steps

### Step 1: Check state and get context
Run \`bp context research\` — outputs JSON with state and file manifest. Read all listed files before proceeding.

### Step 2: Dispatch research sub-agents
Run \`bp dispatch researcher\` for platform-specific dispatch instructions. Dispatch one per technical direction (stack, architecture, pitfalls) in parallel.

Construct each sub-agent prompt:
- Task: research <stack | architecture | pitfalls> for this project
- Read: bp/requirements.md, bp/project.yml
- Templates: tell the sub-agent to fetch its own with \`bp template research-stack\`, \`bp template research-architecture\`, \`bp template research-pitfalls\` (the sub-agent runs these CLI commands itself — do NOT pre-fetch and inline)
- Output: research/stack.md | research/architecture.md | research/pitfalls.md
- The sub-agent's system prompt (.omp/agents/bp-researcher.md) contains detailed research protocol.

### Step 3: Verify sub-agent output
After all sub-agents complete, verify:
- \`research/stack.md\` exists with tech stack comparison and recommendation
- \`research/architecture.md\` exists with architecture evaluation
- \`research/pitfalls.md\` exists with risk assessment
- Write \`research/summary.md\` synthesizing all findings into one recommendation

### Step 4: Commit
\`\`\`bash
bp commit "docs(research): complete technical research" --files "bp/research/stack.md,bp/research/architecture.md,bp/research/pitfalls.md,bp/research/summary.md" --scope research --record
\`\`\`

### Step 5: Advance
Run \`bp continue\` to proceed to roadmap definition.

## Output
- \`research/stack.md\` — recommended tech stack with alternatives compared
- \`research/architecture.md\` — recommended architecture with rationale
- \`research/pitfalls.md\` — known risks and mitigation strategies
- \`research/summary.md\` — consolidated research conclusion

## Guardrails
- Dispatch sub-agents in parallel — they are independent
- Each must compare ≥2 alternatives
- Mark speculative findings with confidence levels`;

export function getResearchSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-research',
    description: 'Project-level technical research — dispatch researcher sub-agents in parallel',
    instructions,
  };
}

export function getResearchCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Research',
    description: 'Project-level technical research — dispatch researcher sub-agents in parallel',
    category: 'Discovery',
    tags: ['bp', 'research', 'architecture', 'tech-stack', 'sub-agent'],
    content: instructions,
  };
}
