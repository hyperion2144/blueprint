import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`<change-name>\`** (required) — change name from \`bp state\` or user prompt.

### Prerequisites
- \`bp/requirements.md\` must exist
- Change directory must exist with \`proposal.md\` template

## Steps

### Step 1: Read context
Run \`bp state\` — confirm change name, read milestone and phase.
Run \`bp context plan\` — read requirements.md.

### Step 2: Get template
Run \`bp template proposal\` to read the proposal skeleton.

### Step 3: Fill proposal
Write to the change's \`proposal.md\`:

- **Intent** — what problem/capability, who affected, what if not done, type (bugfix/feature/debt/perf)
- **Scope** — in-scope items (verb-first, one per line), out-of-scope items with reasons
- **Approach** — high-level technical direction: architecture layer, library choices, data flow. No implementation detail — that's for design.md.
- **Must-haves** — 3-7 observable verifiable conditions in SHALL/MUST format
- **Non-goals** — explicitly excluded targets to prevent scope creep

### Step 4: Commit
\`\`\`bash
bp commit "docs(proposal): fill <change-name>" --files "<proposal-path>" --scope docs --record
\`\`\`

### Step 5: Advance
Run \`bp continue change <name>\` — routes to plan.

## Guardrails
- NEVER write implementation details in the proposal — that's for design.md
- Must-haves must be testable (SHALL/MUST format)
- If the proposal template already has content (not placeholder), skip filling and advance`;

export function getProposalSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-proposal',
    description: 'Fill change proposal — intent, scope, approach, must-haves, non-goals',
    instructions,
  };
}

export function getProposalCommandTemplate(): CommandTemplate {
  return {
    description: 'Fill change proposal — intent, scope, approach, must-haves, non-goals',
    category: 'Workflow',
    tags: ['bp', 'proposal', 'change'],
    content: instructions,
  };
}
