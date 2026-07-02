import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the current project

### Prerequisites
- \`bp/requirements.md\` — complete requirements
- \`bp/research/\` — technical research results (if available)

## Steps

### Step 1: Get context
Run \`bp context roadmap\` — outputs JSON with state, requirements.md, and research/ paths. Read all listed files.

### Step 2: Choose planning mode
Ask the user which planning mode they prefer — this determines how milestones and phases are structured:

**MVP mode** (recommended for product-facing projects):
- Each milestone = a shippable product increment (v1.0, v2.0, …)
- Phases within a milestone build toward that release
- First milestone = minimum viable product
- Each milestone delivers end-to-end user value independently

**Technical-layer mode** (for infrastructure/platform/CLI projects):
- Each milestone = a major technical capability layer
- Phases decompose the layer into vertically executable slices
- Each phase produces a demonstrable, testable increment (running binary, deployed service, etc.)
- Layers build on each other — later layers depend on earlier ones

Record the choice at the top of roadmap.md:
\`\`\`markdown
> Planning mode: <mvp || technical-layer>
\`\`\`

### Step 3: Define Milestones
Get the roadmap template: \`bp template roadmap\`. Determine milestones based on the project's scope, requirements, and chosen mode:

**What is a milestone?** A major delivery checkpoint — the project reaches a complete, demonstrable, shippable state. NOT a feature bucket, NOT a sprint, NOT an iteration.

**How to determine milestone count:**
- Read requirements.md — how many distinct shippable increments make sense?
- Simple projects (single capability, e.g. a CLI tool): maybe 1 milestone
- Product projects (user-facing, iterative value): 2-3 milestones (MVP → v2 → v3)
- Platform/infra projects (layered capabilities): 2-4 milestones (foundation → engine → integration → polish)
- Do NOT create milestones just to have milestones — each must deliver something complete

**How mode affects milestone content:**
- **MVP mode**: each milestone = a version users can actually use. M1 = minimum shippable product, M2 = next feature set.
- **Technical-layer mode**: each milestone = a complete technical layer that runs and passes tests. M1 = data + skeleton, M2 = core logic, M3 = integration/API.

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
- <measurable, verifiable condition>
- <at least 2, max 5 criteria>

### Phases

#### Phase: <MVP mode or Technical-layer mode>

**MVP mode**: each phase is a user-facing feature slice
- Phase 1: core flow skeleton → Phase 2: features → Phase 3: polish

**Technical-layer mode**: each phase is a vertical slice through one layer
- Phase 1: foundation (data model, CLI skeleton, tests)
- Phase 2: core engine (primary logic, API surface)
- Phase 3: integration (wiring, error handling, edge cases)
- Phase 4: hardening (perf, security, docs)

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
- Milestones are delivery checkpoints, not feature buckets — each must be a complete, demonstrable state
- Ask the user about MVP vs technical-layer **before** defining anything
- MVP mode: each milestone independently shippable; first = minimum viable product
- Technical-layer mode: each milestone produces an executable/testable artifact that builds on previous layers
- Phase count per milestone: determine by what's needed (typically 1-4 for small, 2-5 for medium, 3-6 for large)
- Each phase deliverable must be verifiable — not "design" or "planning" as standalone phases
- Start with the smallest viable milestone first`;

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
