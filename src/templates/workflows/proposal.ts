import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`$ARGUMENTS\`** (required) — change name from \`bp state\` or user prompt.

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

- **Intent** — what problem/capability, who affected, type (bugfix/feature/debt/perf)
- **References** (phase change only) — list FR/NFR and D IDs that this proposal addresses.
  Extract IDs from \`bp/requirements.md\` (FR-N) and \`context.md\` (D-N).
  Adhoc change: skip References section.
- **Deliverables** — list each deliverable as \`PR-1\`, \`PR-2\`... with \`refs: FR-{id}, D-{id}\`.
  Each PR item must specify which requirement/decision it implements.
  Every PR ref must exist in requirements.md or context.md — validation checks this.
- **Scope** — what's included, what's excluded

### Step 4: Verify references
Read \`bp/requirements.md\` and \`context.md\`. Confirm every \`refs\` ID in your proposal's deliverables
exists in those files. Missing IDs will cause \`bp continue\` to block.

### Step 5: Commit
\`\`\`bash
bp commit "docs(proposal): fill [BP:CHANGE_NAME]" --files "<proposal-path>" --scope docs --record
\`\`\`

### Step 6: Advance
Run \`bp continue change $1\` — routes to plan.

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
