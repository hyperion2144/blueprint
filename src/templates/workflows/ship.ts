import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: auto-detect ship context from \`specwf state\`

### Prerequisites
- Phase ship: all phase changes archived
- Milestone ship: all phases shipped
- Git remote configured (for PR creation)

## Steps

### Step 1: Get context
Run \`specwf context ship\` — outputs JSON with state info. Determine ship context (phase or milestone).

### Step 2: Dry-run first
Always preview before executing:

\`\`\`bash
specwf ship --dry-run
\`\`\`

Review the output — what will be created, what state will change.

### Step 3: Phase ship
Creates a PR summarizing all changes in the phase:
\`\`\`bash
specwf ship phase
\`\`\`
- Generates phase summary from archived changes
- Creates PR via \`gh pr create\`
- Updates state.md: marks phase as shipped

### Step 4: Milestone ship
Publishes a release tag:
\`\`\`bash
specwf ship milestone
\`\`\`
- Creates release tag (e.g. v0.1.0)
- Updates project.md version
- Updates state.md: marks milestone as shipped

### Step 5: Advance to next phase or milestone
After shipping, read roadmap.md to determine what's next:
- **Phase shipped but more phases in milestone**: run \`specwf state set-phase <next-phase-id>\` then \`specwf continue\`
- **Milestone shipped**: run \`specwf state set-milestone <next-milestone-id>\` then \`specwf state set-phase <first-phase-id>\` then \`specwf continue\`
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
    name: 'specwf-ship',
    description: 'Ship — dry-run first, then create PR or release tag',
    instructions,
  };
}

export function getShipCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Ship',
    description: 'Ship — dry-run first, then create PR or release tag',
    category: 'Workflow',
    tags: ['specwf', 'ship', 'release', 'pr'],
    content: instructions,
  };
}
