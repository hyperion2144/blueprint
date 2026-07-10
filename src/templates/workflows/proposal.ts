import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`$ARGUMENTS\`** (required) — change name from \`bp state\` or user prompt.

### Prerequisites
- Change must be activated (status: \`proposal\`)
- \`bp/requirements.md\` must exist (for phase changes)

## Steps

### Step 1: Determine change type
Run \`bp context plan\` to read state. Check if this is a phase change or adhoc change.

**Phase change** — has milestone and phase in context, and requirements.md / context.md exist.
**Adhoc change** — no milestone/phase context.

### Step 2A: Phase change — fill from requirements
1. Read \`bp/requirements.md\` — extract FR/NFR IDs and descriptions
2. Read phase \`context.md\` — extract D IDs and decisions
3. Run \`bp template proposal\` to get the proposal skeleton
4. Write to \`proposal.md\`:
   - **Intent** — what problem/capability, who affected
   - **References** — list FR/NFR and D IDs that this proposal addresses
   - **Deliverables** — list each deliverable as \`PR-1\`, \`PR-2\`... with \`refs: FR-{id}, D-{id}\`
   - **Scope** — what's included, what's excluded

### Step 2B: Adhoc change — ask the user
1. The change has no requirement references. **Ask the user** what they want to do:
   - "What problem are you fixing or what feature are you adding?"
   - "Describe the deliverable in a few sentences."
   - "What's included vs out of scope?"
2. Run \`bp template proposal\` to get the proposal skeleton
3. Write to \`proposal.md\` based on what the user described:
   - **Intent** — based on user description
   - **Deliverables** — list \`PR-1\`, \`PR-2\`... with descriptions (no refs needed)
   - **Scope** — what's included

### Step 3: Commit
\`\`\`bash
bp commit "docs(proposal): fill [BP:CHANGE_NAME]" --files "<proposal-path>" --scope docs --record
\`\`\`

### Step 4: Advance
Run \`bp continue change $1\` — routes to plan.

## Guardrails
- NEVER write implementation details in the proposal — that's for design.md
- Phase changes MUST reference FR/NFR and D IDs in their deliverables
- Adhoc changes do NOT reference requirements — use user description instead
- If the proposal already has content, skip filling and advance`;

export function getProposalSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-proposal',
    description: 'Fill change proposal — intent, scope, deliverables',
    instructions,
  };
}

export function getProposalCommandTemplate(): CommandTemplate {
  return {
    description: 'Fill change proposal — intent, scope, deliverables',
    category: 'Workflow',
    tags: ['bp', 'proposal', 'change'],
    content: instructions,
  };
}
