import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- No parameters: operate on the current project

## Steps

### Step 1: Get context

Read \`bp/requirements.md\` and \`bp/config.yaml\` to understand the project scope and constraints.

### Step 2: Detect roadmap state

Read \`bp/roadmap.md\`. Check if it already has defined milestones.

**First time (no milestones defined):**
Continue to Step 3.

**Adding a new milestone (roadmap already exists):**
- Mark all existing milestones as completed: \`[ACTIVE]\` -> \`[COMPLETED]\`
- Append new milestone(s) BELOW existing milestones, separated by \`---\`
- Create directories for the new milestone only: \`mkdir -p bp/milestones/<mid>/phases/<pid>\`

### Step 3: Choose planning mode (first time only)

Use \`ask\` to determine the planning mode:

- **MVP mode** (product-facing): each phase delivers user-facing value
- **Technical-layer mode** (infrastructure/CLI): each phase produces a runnable/testable artifact

### Step 4: Define Milestones

Get the roadmap template: \`bp template roadmap\`. Fill with milestones and phases.

**Default: 1 milestone = the entire project.** Milestones are product releases, NOT development phases.

### Step 5: Create milestone directory and first phase directory only

Create the milestone root and only the first phase directory. Remaining directories are created on-demand.

### Step 6: Validate coverage

- All requirements scope covered by milestones and phases
- Phase dependencies form a DAG (no cycles)
- Each phase has a concrete, verifiable deliverable
- Phase count per milestone: small 1-2, medium 2-3, large 3-4
- First phase is always the thinnest possible end-to-end path

## Output

- \`bp/roadmap.md\` — structured roadmap with milestone and phase info
- \`bp/milestones/<mid>/\` — per-milestone directories

## Guardrails

- **Default: 1 milestone.** No "foundation", "setup", "scaffolding" — M1 = shippable product.
- **Create milestone root + first phase directory only.** Remaining directories created on-demand.
- Mode (MVP/technical-layer) shapes phases within a milestone, not the milestones themselves.
- First phase = thinnest end-to-end path (always phase 1, never phase 0).
- **Adding new milestone**: mark old ones as COMPLETED, append new ones below, don't overwrite.
`;

export function getRoadmapSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-roadmap',
    description: 'Roadmap definition — split project into Milestones x Phases with structured format',
    instructions,
  };
}

export function getRoadmapCommandTemplate(): CommandTemplate {
  return {
    description: 'Roadmap definition — split project into Milestones x Phases with structured format',
    category: 'Planning',
    tags: ['bp', 'roadmap', 'planning', 'milestones'],
    content: instructions,
  };
}
