import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the current phase from \`specwf state\`

### Prerequisites
- \`context.md\` — phase decisions and constraints
- \`research.md\` — implementation research

## Steps

### Step 1: Get context
Run \`specwf context split\` — outputs JSON with state, context.md, and research.md paths. Read all listed files.

### Step 2: Split into changes
Decompose the phase scope into independently implementable Change units:
- Each change is a vertical slice (not layer-by-layer)
- Identify dependencies → dependency graph (must be a DAG)
- Each change gets a descriptive kebab-case name

Create each change under the phase directory:
\`\`\`bash
specwf change new <change-name> --milestone <milestone-id> --phase <phase-id>
\`\`\`
This creates \`specwf/milestones/<mid>/phases/<pid>/changes/<name>/\` with all artifact templates.

### Step 3: Document dependency graph
Record in state.md:
\`\`\`yaml
changes:
  - name: <change-1>
    status: planned
    depends_on: []
  - name: <change-2>
    status: planned
    depends_on: [<change-1>]
\`\`\`

### Step 4: Validation checklist
Before advancing, verify:
- [ ] Each change is a vertical slice (delivers end-to-end value)
- [ ] Dependency graph is a DAG (no cycles)
- [ ] Change count: 3-8
- [ ] No purely sequential changes (merge them into one)
- [ ] Every change has a directory with proposal.md template

### Step 5: Advance
Run \`specwf continue\` to proceed to change planning.

## Output
- \`specwf/milestones/<mid>/phases/<pid>/changes/<name>/\` — one directory per change
- Updated \`state.md\` with change dependency graph

## Guardrails
- Changes must be vertical slices — each delivers end-to-end value
- Dependency graph must be a DAG — no cycles
- 3-8 changes per phase is the sweet spot
- Merge purely sequential changes into one`;

export function getSplitSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-split',
    description: 'Change splitting — dependency graph + N changes with validation',
    instructions,
  };
}

export function getSplitCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Split',
    description: 'Change splitting — dependency graph + N changes with validation',
    category: 'Planning',
    tags: ['specwf', 'split', 'changes', 'dependency-graph'],
    content: instructions,
  };
}
