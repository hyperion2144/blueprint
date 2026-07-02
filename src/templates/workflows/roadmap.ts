import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the current project

### Prerequisites
- \`bp/requirements.md\` — complete requirements
- \`bp/research/\` — technical research results (if available)

## Steps

### Step 1: Get context
Run \`bp context roadmap\` — outputs state, requirements.md, and research/ paths. Read all listed files.

### Step 2: Choose planning mode
Ask the user which planning mode shapes **phases within each milestone**:

- **MVP mode** (product-facing): each phase delivers user-facing value — ph.1 thinnest end-to-end → ph.2 expand → ph.3 polish
- **Technical-layer mode** (infrastructure/CLI): each phase produces a runnable/testable artifact — ph.1 data+core logic → ph.2 API+integration → ph.3 hardening

Use the \`ask\` tool. Record the choice at the top of roadmap.md: \`> Planning mode: <mvp || technical-layer>\`

### Step 3: Define Milestones
Get the roadmap template: \`bp template roadmap\`. Fill with milestones and phases per the mode chosen above.

**Default: 1 milestone = the entire project.** Milestones are product releases, NOT development phases. Only add M2+ when the user explicitly wants iterative releases (v1.0 → v2.0) and each milestone independently delivers value.

### Step 4: Create milestone directories
For each milestone-phase pair in the roadmap:
\`\`\`bash
mkdir -p bp/milestones/<milestone-id>/phases/<phase-id>
\`\`\`
Without these directories, the state machine cannot advance past roadmap.

### Step 5: Validate coverage
- All requirements.md scope covered by milestones and phases
- Phase dependencies form a DAG (no cycles)
- Each phase has a concrete, verifiable deliverable (not "design complete" — must be executable)
- Phase count per milestone: small 1-2, medium 2-3, large 3-4
- First phase is always the thinnest possible end-to-end path

### Step 6: Commit
\`\`\`bash
bp commit "docs(roadmap): define milestones and phases" --files "bp/roadmap.md" --scope roadmap --record
\`\`\`

### Step 7: Advance
Activate the first milestone and its first phase, then advance:
\`\`\`bash
bp state set-milestone <first-milestone-id>
bp state set-phase <first-phase-id>
bp continue
\`\`\`

## Output
- \`bp/roadmap.md\` — structured roadmap with milestone and phase tables, planning mode declared
- \`bp/milestones/<id>/\` — per-milestone directories

## Guardrails
- **Default: 1 milestone.** No "foundation", "setup", "scaffolding" — M1 = shippable product.
- Mode (MVP/technical-layer) shapes **phases within a milestone**, not the milestones themselves.
- First phase = thinnest end-to-end path (always phase 1, never phase 0).`;

export function getRoadmapSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-roadmap',
    description: 'Roadmap definition — split project into Milestones x Phases with structured format',
    instructions,
  };
}

export function getRoadmapCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Roadmap',
    description: 'Roadmap definition — split project into Milestones x Phases with structured format',
    category: 'Planning',
    tags: ['bp', 'roadmap', 'planning', 'milestones'],
    content: instructions,
  };
}
