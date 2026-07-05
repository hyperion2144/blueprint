import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`$ARGUMENTS\`** (required) — kebab-case name for the new adhoc change.
- If no name is provided, ask the user: "What should we call this change? (kebab-case, e.g. fix-login-timeout)"

### Prerequisites
- bp project must be initialized

## Steps

### Step 1: Resolve change name
If a name was provided: use it directly.
If no name: ask the user for a descriptive kebab-case name.

### Step 2: Create the adhoc change
Run \`bp change new $1\` to create:
- \`bp/changes/$1/proposal.md\` — proposal template
- \`bp/changes/$1/design.md\` — design template
- \`bp/changes/$1/tasks.md\` — tasks template
- \`bp/changes/$1/specs/\` — delta-specs directory

The change is registered in \`state.md\` under the adhoc list with status \`proposal\`.

### Step 3: Fill the proposal
Get the proposal template: \`bp template proposal\`. Fill \`proposal.md\` — describe the intent, scope, approach, and must-haves.

### Step 4: Advance
Run \`bp continue change $1\` to proceed through the standard change cycle.

## Output
- \`bp/changes/$1/\` — change directory with template files
- Updated \`state.md\` with new adhoc entry

## Guardrails
- Adhoc changes do NOT go through milestone/phase discuss/research-phase/split flow
- To associate with a phase, use \`bp change new --phase <id>\`
- Archived adhoc changes are stored under \`bp/archive/\`
- Adhoc changes follow the same plan->apply->review->verify->archive cycle as phase changes`;

export function getAdhocSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-adhoc',
    description: 'Create adhoc change — independent change unrelated to milestone/phase',
    instructions,
  };
}

export function getAdhocCommandTemplate(): CommandTemplate {
  return {
    description: 'Create adhoc change — independent change unrelated to milestone/phase',
    category: 'Workflow',
    tags: ['bp', 'adhoc', 'change'],
    content: instructions,
  };
}
