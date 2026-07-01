import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the current project

### Prerequisites
- \`specwf/requirements.md\` — complete requirements
- \`specwf/research/\` — technical research results (if available)

## Steps

### Step 1: Get context
Run \`specwf context roadmap\` — outputs JSON with state, requirements.md, and research/ paths. Read all listed files.

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
> Planning mode: {{mvp | technical-layer}}
\`\`\`

### Step 3: Define Milestones (2-5 lifecycle-scale milestones)
Get the roadmap template: \`specwf template roadmap\`. Milestones are **major lifecycle stages**, not feature buckets:
- A project typically has 2-5 milestones total
- Each milestone represents a strategic delivery checkpoint (v1, v2, platform layer, etc.)
- Do NOT create one milestone per feature or module

Fill the template:
\`\`\`markdown
# Roadmap

> Planning mode: {{mode}}

## Milestones

| ID | Goal | Phases | Mode |
|----|------|--------|------|
| M1-<name> | <one-sentence goal> | <count> | {{mode}} |

## M1-<name>: <goal>

### Success Criteria
- <measurable, verifiable condition>
- <at least 2, max 5 criteria>

### Phases

#### Phase: {{MVP mode or Technical-layer mode}}

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
mkdir -p specwf/milestones/<milestone-id>/phases/<phase-id>
\`\`\`
Do this for every milestone-phase pair defined in the roadmap. Without these directories, the state machine cannot advance past roadmap.

### Step 5: Validate coverage
- All requirements.md scope covered by milestones and phases
- Phase dependencies form a DAG (no cycles)
- Each phase has a concrete, verifiable deliverable (not "design complete" — must be executable)
- Phase count per milestone: 3-5 (MVP) or 3-6 (technical-layer)
- First phase is always the thinnest possible end-to-end path

### Step 6: Advance
Activate the first milestone and its first phase, then advance:
\`\`\`bash
specwf state set-milestone <first-milestone-id>
specwf state set-phase <first-phase-id>
specwf continue
\`\`\`

## Output
- \`specwf/roadmap.md\` — structured roadmap with milestone and phase tables, planning mode declared
- \`specwf/milestones/<id>/\` — per-milestone directories

## Guardrails
- **2-5 milestones maximum** — milestones are lifecycle stages, not feature buckets
- Ask the user about MVP vs technical-layer **before** defining anything
- MVP mode: each milestone independently shippable; first = minimum viable product
- Technical-layer mode: each phase produces an executable/testable artifact
- Phase count per milestone: 3-6 (do not create 10+ micro-phases)
- Each phase deliverable must be verifiable — not \"design\" or \"planning\" as standalone phases
- Start with the smallest viable milestone first`;

export function getRoadmapSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-roadmap',
    description: 'Roadmap definition — split project into Milestones x Phases with structured format',
    instructions,
  };
}

export function getRoadmapCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Roadmap',
    description: 'Roadmap definition — split project into Milestones x Phases with structured format',
    category: 'Planning',
    tags: ['specwf', 'roadmap', 'planning', 'milestones'],
    content: instructions,
  };
}
