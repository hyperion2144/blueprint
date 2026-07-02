import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Two commands — two scopes

| Command | Scope | When to use |
|---------|-------|------------|
| \`bp continue\` | Project-level / Phase-level | After init, grill, research, roadmap, discuss, research-phase, split, ship |
| \`bp continue change <name>\` | Single change | Advance a specific change through plan → apply → review → verify → archive |

### Prerequisites
- \`bp/state.md\` must exist and be valid
- Previous step must be complete (exit conditions met)

## Steps

### Scenario A: Project-level advancement (\`bp continue\`)

Use this after project-level steps (init, grill, research, roadmap, discuss, research-phase, split, ship).

Run \`bp continue\`. The CLI:
1. Reads \`active_context\` from state.md to determine what's current
2. Validates the current step's exit conditions
3. Advances state to the next step
4. Outputs the next step's inline instructions

Examples:
- After \`bp init\` → \`bp continue\` routes to grill
- After grill → routes to research
- After research → routes to roadmap
- After roadmap → routes to discuss (first phase)
- After discuss → routes to research-phase
- After research-phase → routes to split
- After split → routes to plan (for first change)

If \`bp continue\` says "No available next step" but the project has pending changes, switch to Scenario B for those changes.

### Scenario B: Change-level advancement (\`bp continue change <name>\`)

Use this to advance an individual change through its cycle. The change name comes from:
- The \`bp continue\` output (which tells you which change to work on)
- \`bp state\` output (lists pending changes with their status)
- User explicitly naming a change

**With a name**: run \`bp continue change <name>\`. The CLI advances that change's state and outputs the next step's inline instructions.

**Without a name**: run \`bp state\`, read the pending changes list, and present options:

\`\`\`
Which change should I advance?

1. <change-name> [planning] — ready for apply
2. <change-name> [applying] — ready for review
3. <change-name> [proposal] — ready for plan

Pick a number or name.
\`\`\`

Then run \`bp continue change <selected-name>\`.

### Scenario C: No pending work

If both \`bp continue\` and all pending changes report "No available next step":

\`\`\`
All work is complete or blocked.

Current state:
- Project status: <status>
- Active milestone: <name>
- Pending changes: <list or "none">
- Adhoc changes: <list or "none">

Run \`bp state\` to inspect. To start new work:
- \`bp state set-milestone <id>\` then \`bp state set-phase <phase-id>\` to activate the next milestone/phase
- \`bp change new <name>\` for an adhoc change
- \`bp continue\` after completing blocking prerequisites
\`\`\`

## Output
Inline instructions for the next workflow step, including:
- Current position and context
- Next command name and slash command
- Whether sub-agents are needed
- Full step instructions (Input, Steps, Output, Guardrails)

## Guardrails
- **CRITICAL — READ THIS FIRST**: The \`_note\` field in the output tells you if instructions are truncated. If \`truncated: true\`, you MUST read the source file listed at the end of the instructions. Never act on partial instructions.
- \`bp continue\` (no args) = project/phase level; \`bp continue change <name>\` = change level — do not mix them
- Continue does NOT advance state if exit conditions are not met — it reports what's blocking
- When multiple changes are pending, always present choices — do not silently pick one`;

export function getContinueSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-continue',
    description: 'Auto-advance — project-level or change-level, present pending work, route to next step',
    instructions,
  };
}

export function getContinueCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Continue',
    description: 'Auto-advance — project-level or change-level, present pending work, route to next step',
    category: 'Workflow',
    tags: ['bp', 'continue', 'state-machine'],
    content: instructions,
  };
}
