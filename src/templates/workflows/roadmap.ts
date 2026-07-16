import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- No parameters: operate on the current project

## Steps

### Step 1: Discuss project requirements

Before defining any milestones, understand the project goals and requirements:

Use \`ask\` to discuss:
- **Project goal**: What is this project trying to achieve? What problem does it solve?
- **Target users**: Who will use this? What are their needs?
- **Key features**: What are the main capabilities required? List them.
- **Constraints**: Any technical, timeline, or resource constraints?
- **Existing codebase**: If brownfield, what exists already? What needs to change?

Take notes on the discussion. These will inform the roadmap structure.

### Step 2: Choose planning mode

Based on the discussion, determine the planning mode:

- **MVP mode** (product-facing): each phase delivers user-facing value
  - Phases: "User can sign up" -> "User can make a payment" -> "User can view history"
- **Technical-layer mode** (infrastructure/CLI): each phase produces a runnable/testable artifact
  - Phases: "CLI scaffold" -> "Core engine" -> "Command implementations"

### Step 3: Define Milestones

Get the roadmap template: \`bp template roadmap\`. Fill with milestones and phases.

**Default: 1 milestone = the entire project.** Milestones are product releases, NOT development phases.

Each milestone:
- Has a clear goal (what value it delivers)
- Contains 2-4 phases
- First phase is always the thinnest end-to-end path

Each phase:
- Has a concrete, verifiable deliverable
- Maps to one or more spec domains
- Lists planned changes (what \`bp propose\` will create)

### Step 4: Validate

Check before finishing:
- [ ] All project requirements from the discussion are covered by some phase
- [ ] Phase dependencies form a DAG (no cycles)
- [ ] Each phase has a concrete, verifiable deliverable
- [ ] Phase count per milestone: small 1-2, medium 2-3, large 3-4
- [ ] First phase is the thinnest end-to-end path
- [ ] No template placeholders remaining (\`{{\`)

## Output

- \`bp/roadmap.md\` — structured roadmap with milestone and phase info

## Guardrails

- **Default: 1 milestone.** No "foundation", "setup", "scaffolding" milestone — M1 = shippable product.
- Mode (MVP/technical-layer) shapes phases within a milestone, not the milestones themselves.
- First phase = thinnest end-to-end path (always first phase, never "phase 0").
- **Adding new milestone**: append new ones below existing, don't overwrite.
- Do NOT create milestone directories — v2 uses roadmap.md as the single tracking document.
`;

export function getRoadmapSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-roadmap',
    description: 'Discuss requirements, then define roadmap with milestones and phases',
    instructions,
  };
}

export function getRoadmapCommandTemplate(): CommandTemplate {
  return {
    description: 'Discuss requirements, then define roadmap with milestones and phases',
    category: 'Planning',
    tags: ['bp', 'roadmap', 'planning', 'milestones', 'requirements'],
    content: instructions,
  };
}
