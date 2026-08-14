import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, starts from current project state.

## Steps

> \`bp ff\` auto-advances through steps by calling \`bp continue\` after each. Follow the instructions each \`bp continue\` outputs.

For each iteration:

1. Get the current step:

\`\`\`bash
bp continue $ARGUMENTS
\`\`\`

2. Execute the instructions it outputs — dispatch sub-agents, write files, run code, etc.
3. After the step completes, return to step 1.
4. Stop when \`bp continue\` shows no more actionable steps (no active changes, roadmap has no \`[ ]\` items), or an unrecoverable error occurs — report it and stop.

## Output

- Progress report to the user after each iteration.

## Guardrails

- Respect all gates: review.md must be PASS before \`bp archive\`; any non-PASS verdict routes to \`bp check\` (fixer loopback + full re-review).
- Do NOT skip the check step.
- Do NOT auto-archive if the review verdict is FAIL or NEEDS_REVISION.
- You MAY ask the user clarifying questions if truly blocked, but default to proceeding with the most reasonable interpretation.
- If a step is unclear or the output is unexpected, stop and ask the user.
`;

export function getFfSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-ff',
    description: 'Fast-forward - auto-advance through all next steps by calling bp continue after each',
    instructions,
  };
}

export function getFfCommandTemplate(): CommandTemplate {
  return {
    description: 'Fast-forward - auto-advance through all next steps by calling bp continue after each',
    category: 'Workflow',
    tags: ['bp', 'ff', 'fast-forward', 'auto-advance'],
    content: instructions,
  };
}
