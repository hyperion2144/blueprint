import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **No parameters**: auto-detect ship context from \`bp state\`

### Prerequisites
- Phase ship: all phase changes archived
- Milestone ship: all phases shipped
- Git remote configured (for PR creation)

## Steps

### Step 1: Get context
Run \`bp context ship\` — outputs state info. Determine ship context (phase or milestone).

### Step 2: Dry-run first
Always preview before executing:
\`\`\`bash
bp ship --dry-run
\`\`\`

Review the output — dry-run validates:
- All changes have change-summary.md
- All verification.md status: passed
- All three reviews (spec/quality/goal) PASS
- If any FAIL, fix before proceeding

### Step 3: Ship phase
Run \`bp ship\` — the CLI:
1. Validates all archived changes (dry-run checks above)
2. Generates \`summary.md\` with verification matrix + full change summaries + review verdicts
3. Updates state.md: phase-shipped
4. Auto-commits (\`git add\` + \`git commit\`)
5. Outputs next phase hint

### Step 4: Advance
After shipping:
- **More phases in milestone**: run \`bp state set-phase <next-phase-id>\` then \`bp continue\`
- **All phases shipped**: run \`bp ship\` again — milestone ship creates version bump + git tag
- **Last milestone**: project complete

## Output
- PR on GitHub (phase ship)
- Release tag (milestone ship)
- Updated \`state.md\` and \`project.md\`

## Guardrails
- Always \`--dry-run\` first; never ship without validation
- All changes must be archived with reviews PASS + verification passed
- CLI auto-commits — no manual \`git add\` needed`;

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
