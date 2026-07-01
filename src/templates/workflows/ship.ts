import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: auto-detect ship context from \`bp state\`

### Prerequisites
- Phase ship: all phase changes archived
- Milestone ship: all phases shipped
- Git remote configured (for PR creation)

## Steps

### Step 1: Get context
Run \`bp context ship\` — outputs JSON with state info. Determine ship context (phase or milestone).

### Step 2: Dry-run first
Always preview before executing:

\`\`\`bash
bp ship --dry-run
\`\`\`

Review the output — what will be created, what state will change.

### Step 3: Phase ship
Creates a PR summarizing all changes in the phase:
\`\`\`bash
bp ship phase
\`\`\`
- Generates phase summary from archived changes
- Creates PR via \`gh pr create\`
- Updates state.md: marks phase as shipped

### Step 4: Milestone ship
Publishes a release tag:
\`\`\`bash
bp ship milestone
\`\`\`
- Creates release tag (e.g. v0.1.0)
- Updates project.md version
- Updates state.md: marks milestone as shipped

### Step 5: Advance to next phase or milestone
After shipping, read roadmap.md to determine what's next:
- **Phase shipped but more phases in milestone**: run \`bp state set-phase <next-phase-id>\` then \`bp continue\`
- **Milestone shipped**: run \`bp state set-milestone <next-milestone-id>\` then \`bp state set-phase <first-phase-id>\` then \`bp continue\`
- **Last milestone shipped**: project complete — update project.md status

## Output
- PR on GitHub (phase ship)
- Release tag (milestone ship)
- Updated \`state.md\` and \`project.md\`

## Guardrails
- Always run \`--dry-run\` first — never ship without previewing
- Phase ship requires all changes archived
- Milestone ship requires all phases shipped`;

export function getShipSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-ship',
    description: 'Ship — dry-run first, then create PR or release tag',
    instructions,
  };
}

export function getShipCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Ship',
    description: 'Ship — dry-run first, then create PR or release tag',
    category: 'Workflow',
    tags: ['bp', 'ship', 'release', 'pr'],
    content: instructions,
  };
}
