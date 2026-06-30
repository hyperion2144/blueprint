import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the currently active phase from \`specwf state\`

### Prerequisites
- Active milestone and phase must be set
- \`specwf/roadmap.md\` — current phase description and boundaries

## Steps

### Step 1: Get context
Run \`specwf context discuss\` — outputs JSON with state and roadmap path. Read roadmap.md.

### Step 2: Discuss and record decisions
Walk through each topic with the user. Record every decision using this format in context.md:

\`\`\`markdown
## D1: <decision title>
- **Decision**: <what we chose>
- **Rationale**: <why we chose it>
- **Alternatives considered**: <what else we evaluated and why rejected>
- **Impact**: <what this affects — files, interfaces, constraints>

## D2: <decision title>
...
\`\`\`

Topics to cover:
- **Phase goals** — what this phase delivers
- **Interface contracts** — key APIs and data models
- **Implementation constraints** — technical limits
- **Change split plan** — preliminary breakdown
- **Non-goals** — explicitly excluded

### Step 3: Mark gray areas
Unresolved items: mark as \`[TODO: discuss]\` with a brief note on what's blocking.

### Step 4: Advance
Run \`specwf continue\` to proceed to research-phase.

## Output
- \`context.md\` — phase-level implementation decisions (D1, D2, ... format)

## Guardrails
- Every architecture decision gets a unique D-number for traceability
- Do not skip gray areas — mark them and revisit
- context.md is the single source of truth for phase implementation`;

export function getDiscussSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-discuss',
    description: 'Phase discussion — capture implementation decisions with D1/D2 format',
    instructions,
  };
}

export function getDiscussCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Discuss',
    description: 'Phase discussion — capture implementation decisions with D1/D2 format',
    category: 'Planning',
    tags: ['specwf', 'discuss', 'context', 'decisions'],
    content: instructions,
  };
}
