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

### Step 2: Define Milestones
Get the roadmap template: \`specwf template roadmap\`. Define milestones by functional area or release cadence. Fill the template and write to \`specwf/roadmap.md\`:

\`\`\`markdown
# Roadmap

## Milestones

| ID | Goal | Phases | Duration |
|----|------|--------|----------|
| M1-<name> | <one-sentence goal> | <count> | <duration> |

## M1-<name>: <goal>

### Success Criteria
- <measurable condition>

### Phases

| ID | Goal | Depends On | Changes |
|----|------|-----------|---------|
| ph.1-<name> | <goal> | - | <count> |
| ph.2-<name> | <goal> | ph.1 | <count> |

### ph.1-<name>
- **Goal**: <what this phase delivers>
- **Inputs**: <specs, conventions, docs>
- **Outputs**: <code, specs, docs>
\`\`\`

### Step 3: Create milestone directories
For each milestone, create: \`specwf/milestones/<id>/\`

### Step 4: Validate coverage
- All functional scope covered by milestones and phases
- Phase dependencies form a DAG (no cycles)
- Each phase has verifiable success criteria
- Total phase count: 3-15
- First phase is the minimum viable path

### Step 5: Advance
Run \`specwf state set-milestone <id>\` to activate the first milestone, then \`specwf continue\`.

## Output
- \`specwf/roadmap.md\` — structured roadmap with milestone and phase tables
- \`specwf/milestones/<id>/\` — per-milestone directories

## Guardrails
- Start with the smallest viable milestone first
- Phase count per milestone: 3-8
- Each phase must produce a demonstrable increment
- Use the table format above — it's structured and parseable`;

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
