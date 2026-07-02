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
Ask the user which planning mode they prefer — this determines how **phases** are structured within each milestone:

**MVP mode** (for product-facing projects):
- Each phase is a user-facing feature slice — every phase delivers something the user can see/use
- Phase 1: thinnest end-to-end path → Phase 2: iterate and expand → Phase 3: polish

**Technical-layer mode** (for infrastructure/platform/CLI):
- Each phase builds a technical layer that produces a runnable/testable artifact
- Phase 1: data + core logic → Phase 2: API + integration → Phase 3: hardening

Record the choice at the top of roadmap.md:
\`\`\`markdown
> Planning mode: <mvp || technical-layer>
\`\`\`

### Step 3: Define Milestones
Get the roadmap template: \`bp template roadmap\`.

**Default: 1 milestone = the entire project.** In most cases, you only need one. Milestones are NOT development phases — they are product releases.

- If the project IS "build a Sokoban game": M1-sokoban. Done.
- If the project has a v1 core AND a planned v2 expansion: M1-core, M2-expansion.
- If you find yourself creating M1-foundation, M2-features, M3-polish — STOP. Those are phases, not milestones. Merge them into one milestone.

**Only add M2+ when:**
1. The user explicitly wants iterative releases (v1.0 → v2.0)
2. Each milestone independently delivers value to end users
3. The scope is too large for a single release

Fill the template with **1 milestone** by default:

Fill the template:
\`\`\`markdown
# Roadmap

> Planning mode: <mode>

## Milestones

| ID | Goal | Phases | Mode |
|----|------|--------|------|
| M1-<name> | <one-sentence goal> | <count> | <mode> |

## M1-<name>: <goal>

### Success Criteria
- <measurable, verifiable condition — what makes M1 "done">
- <at least 2, max 5 criteria>

### Phases

#### Phase: <MVP mode or Technical-layer mode>

**MVP mode** — each phase delivers user-observable value:
- ph.1: thinnest end-to-end user flow → ph.2: expand features → ph.3: polish

**Technical-layer mode** — each phase produces a runnable/testable artifact:
- ph.1: data model + core logic → ph.2: API + integration → ph.3: hardening

| ID | Goal | Depends On | Changes | Deliverable |
|----|------|-----------|---------|------------|
| ph.1-<name> | <goal> | - | <count> | <executable artifact> |
| ph.2-<name> | <goal> | ph.1 | <count> | <executable artifact> |

### ph.1-<name>
- **Goal**: <what this phase delivers>
- **Deliverable**: <runnable binary, deployed endpoint, test suite passing, etc.>
- **Inputs**: <specs, conventions, docs>
- **Outputs**: <code, specs, docs>
\`\`\`

### Step 4: Create milestone directories
For each milestone in the roadmap, create its directory:
\`\`\`bash
mkdir -p bp/milestones/<milestone-id>/phases/<phase-id>
\`\`\`
Do this for every milestone-phase pair defined in the roadmap. Without these directories, the state machine cannot advance past roadmap.

### Step 5: Validate coverage
- All requirements.md scope covered by milestones and phases
- Phase dependencies form a DAG (no cycles)
- Each phase has a concrete, verifiable deliverable (not "design complete" — must be executable)
- Phase count per milestone: determine by what's needed (typically 1-4 for small, 2-5 for medium, 3-6 for large)
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
- **Default: 1 milestone.** Only add more if the user needs iterative releases.
- M1 = shippable product a user can use. No "foundation", "setup", "scaffolding".
- Mode (MVP/technical-layer) shapes **phases within a milestone**, not the milestones themselves.
- Phase count per milestone by project size: small 1-2, medium 2-3, large 3-4.
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
