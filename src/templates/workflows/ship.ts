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

### Step 3: Ship phase
Run \`bp ship\` — the CLI:
1. Reads all archived changes in the current phase from \`bp/archive/<milestone>/<phase>/\`
2. Extracts each change's \`change-summary.md\` and \`tasks.md\`
3. Generates \`bp/milestones/<mid>/phases/<pid>/summary.md\` with all change summaries
4. Updates state.md: marks phase as shipped (\`phase-shipped\`)
5. Outputs a summary of what was shipped

### Step 4: Milestone ship (when all phases are shipped)
Run \`bp ship\` — creates release tag and updates version.

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
