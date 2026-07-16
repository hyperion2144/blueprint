import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- No parameters: operate on the current project

## Steps

### Step 1: Get context

Read \`bp/config.yaml\` and \`bp/specs/\` to understand the project scope, tech stack, and existing behavioral contracts.

### Step 2: Detect roadmap state

Read \`bp/roadmap.md\`. Check if it already has defined milestones (look for \`## Milestone:\` headers that have real content, not template placeholders).

**First time (no milestones defined):**
Continue to Step 3.

**Adding a new milestone (roadmap already exists):**
- Append new milestone(s) BELOW existing milestones, separated by \`---\`
- Keep existing milestones with their status unchanged

### Step 3: Choose planning mode (first time only)

Use \`ask\` to determine the planning mode:

- **MVP mode** (product-facing): each phase delivers user-facing value
- **Technical-layer mode** (infrastructure/CLI): each phase produces a runnable/testable artifact

### Step 4: Define Milestones

Get the roadmap template: \`bp template roadmap\`. Fill with milestones and phases.

**Default: 1 milestone = the entire project.** Milestones are product releases, NOT development phases.

### Step 5: Validate

Check before finishing:
- All project scope covered by milestones and phases
- Phase dependencies form a DAG (no cycles)
- Each phase has a concrete, verifiable deliverable
- Phase count per milestone: small 1-2, medium 2-3, large 3-4
- First phase is always the thinnest possible end-to-end path
- No template placeholders remaining (\`{{placeholder}}\`)

## Output

- \`bp/roadmap.md\` — structured roadmap with milestone and phase info

## Guardrails

- **Default: 1 milestone.** No "foundation", "setup", "scaffolding" — M1 = shippable product.
- Mode (MVP/technical-layer) shapes phases within a milestone, not the milestones themselves.
- First phase = thinnest end-to-end path (always first phase, never "phase 0").
- **Adding new milestone**: append new ones below existing, don't overwrite.
- Do NOT create milestone directories — v2 uses roadmap.md as the single tracking document.
`;

export function getRoadmapSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-roadmap',
    description: 'Roadmap definition — split project into milestones x phases with structured format',
    instructions,
  };
}

export function getRoadmapCommandTemplate(): CommandTemplate {
  return {
    description: 'Roadmap definition — split project into milestones x phases with structured format',
    category: 'Planning',
    tags: ['bp', 'roadmap', 'planning', 'milestones'],
    content: instructions,
  };
}
