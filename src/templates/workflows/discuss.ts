import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`<phase-id>\`** (optional) — the phase to discuss (e.g. \`ph.1-core\`). If not provided, read from \`specwf state\` to determine the active phase.

### Prerequisites
- Active milestone and phase must be set
- \`specwf/roadmap.md\` — contains phase definitions with goals and scope

## Steps

### Step 0: Resolve the active phase
If a phase ID was provided, use it directly. If not: run \`specwf state\`, read \`current_phase\` from the output. If no active phase is set, ask the user which phase to discuss.

Print the phase identity before proceeding:
\`\`\`
Phase: <phase-id>  |  Milestone: <milestone-id>
Goal: <phase-goal from roadmap>
Deliverable: <executable artifact>
\`\`\`

### Step 1: Get context
Run \`specwf context discuss\` — outputs JSON with state and roadmap path. Read roadmap.md and extract ONLY the section for this phase. Other phases are irrelevant.

### Step 2: Discuss THIS phase — scope strictly
Get the context template: \`specwf template context\`. Walk through each topic with the user, **scoped to this phase only**.

Read the phase's goal, inputs, outputs, and deliverable from roadmap.md. Use these as the discussion boundary. Record every decision using D1/D2 format:

\`\`\`markdown
# Context: <phase-id>

> Phase: <phase-id>  |  Milestone: <milestone-id>  |  Mode: {{mvp | technical-layer}}
> Goal: <one-line from roadmap>
> Deliverable: <executable artifact>

## D1: <decision title>
- **Decision**: <what we chose>
- **Rationale**: <why we chose it>
- **Alternatives considered**: <what else we evaluated and why rejected>
- **Impact**: <what this affects — files, interfaces, constraints>

## D2: <decision title>
...
\`\`\`

Topics to cover (for THIS phase only):
- **Phase goal & deliverable** — confirm the phase's scope matches roadmap
- **Interface contracts** — key APIs, data models, CLI interfaces this phase produces
- **Implementation constraints** — technical limits specific to this phase
- **Change split plan** — how this phase decomposes into independent changes
- **Non-goals** — explicitly excluded (often from later phases)

### Step 3: Mark gray areas
Unresolved items: mark as \`[TODO: discuss]\` with a brief note on what's blocking.

### Step 4: Advance
Run \`specwf continue\` to proceed to research-phase.

## Output
- \`context.md\` — phase-level implementation decisions (D1, D2, ... format), scoped to one phase

## Guardrails
- **Scope to this phase ONLY** — other phases are discussed separately when their turn comes
- Read the phase goal and deliverable from roadmap.md before starting discussion
- Every architecture decision gets a unique D-number for traceability
- Do not skip gray areas — mark them and revisit
- context.md is the single source of truth for this phase's implementation`;

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
