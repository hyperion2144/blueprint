import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Two commands — two scopes

| Command | Scope | When to use |
|---------|-------|------------|
| \`specwf continue\` | Project-level / Phase-level | After init, grill, research, roadmap, discuss, research-phase, split, ship |
| \`specwf continue change <name>\` | Single change | Advance a specific change through plan → apply → review → verify → archive |

### Prerequisites
- \`specwf/state.md\` must exist and be valid
- Previous step must be complete (exit conditions met)

## Steps

### Scenario A: Project-level advancement (\`specwf continue\`)

Use this after project-level steps (init, grill, research, roadmap, discuss, research-phase, split, ship).

Run \`specwf continue\`. The CLI:
1. Reads \`active_context\` from state.md to determine what's current
2. Validates the current step's exit conditions
3. Advances state to the next step
4. Outputs the next step's inline instructions

Examples:
- After \`specwf init\` → \`specwf continue\` routes to grill
- After grill → routes to research
- After research → routes to roadmap
- After roadmap → routes to discuss (first phase)
- After discuss → routes to research-phase
- After research-phase → routes to split
- After split → routes to plan (for first change)

If \`specwf continue\` says "No available next step" but the project has pending changes, switch to Scenario B for those changes.

### Scenario B: Change-level advancement (\`specwf continue change <name>\`)

Use this to advance an individual change through its cycle. The change name comes from:
- The \`specwf continue\` output (which tells you which change to work on)
- \`specwf state\` output (lists pending changes with their status)
- User explicitly naming a change

**With a name**: run \`specwf continue change <name>\`. The CLI advances that change's state and outputs the next step's inline instructions.

**Without a name**: run \`specwf state\`, read the pending changes list, and present options:

\`\`\`
Which change should I advance?

1. <change-name> [planning] — ready for apply
2. <change-name> [applying] — ready for review
3. <change-name> [proposal] — ready for plan

Pick a number or name.
\`\`\`

Then run \`specwf continue change <selected-name>\`.

### Scenario C: No pending work

If both \`specwf continue\` and all pending changes report "No available next step":

\`\`\`
All work is complete or blocked.

Current state:
- Project status: <status>
- Active milestone: <name>
- Pending changes: <list or "none">
- Adhoc changes: <list or "none">

Run \`specwf state\` to inspect. To start new work:
- \`specwf state set-milestone <id>\` then \`specwf state set-phase <phase-id>\` to activate the next milestone/phase
- \`specwf change new <name>\` for an adhoc change
- \`specwf continue\` after completing blocking prerequisites
\`\`\`

## Output
Inline instructions for the next workflow step, including:
- Current position and context
- Next command name and slash command
- Whether sub-agents are needed
- Full step instructions (Input, Steps, Output, Guardrails)

## Guardrails
- \`specwf continue\` (no args) = project/phase level; \`specwf continue change <name>\` = change level — do not mix them
- Continue does NOT advance state if exit conditions are not met — it reports what's blocking
- The output instructions are self-contained — execute them directly, no need to read another file
- When multiple changes are pending, always present choices — do not silently pick one`;

export function getContinueSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-continue',
    description: 'Auto-advance — project-level or change-level, present pending work, route to next step',
    instructions,
  };
}

export function getContinueCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Continue',
    description: 'Auto-advance — project-level or change-level, present pending work, route to next step',
    category: 'Workflow',
    tags: ['specwf', 'continue', 'state-machine'],
    content: instructions,
  };
}
