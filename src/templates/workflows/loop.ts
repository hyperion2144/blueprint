import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, starts from current project state.

## Steps

> \`bp loop\` auto-advances through steps by calling \`bp continue\` after each — same as \`bp ff\` but skips ALL user interaction. Run until the roadmap has no remaining \`[ ]\` items.

For each iteration:

1. Get the current step:

\`\`\`bash
bp continue $ARGUMENTS
\`\`\`

2. Execute the instructions WITHOUT asking the user anything. If an instruction says to use \`ask\`, skip it and use sensible defaults.
3. After the step completes, return to step 1.
4. Stop when the roadmap has no \`[ ]\` items (all milestones shipped, all changes archived), or an unrecoverable error occurs — report it and stop.

## Output

- Concise progress report after each iteration and a summary when done.

## Guardrails

- Do NOT call \`ask\` or \`ask_user_question\` for anything.
- For ambiguous requirements/tool output: use the most reasonable defaults, document assumptions in the artifact, and continue.
- Respect all gates: review.md must be PASS before \`bp archive\`; any non-PASS verdict routes to \`bp check\` (fixer loopback + full re-review).
- Do NOT skip the check step.
- Do NOT auto-archive if the review verdict is FAIL or NEEDS_REVISION.
- Only stop on hard errors (test failures that cannot be fixed in 1 attempt, unrecoverable build errors).
`;

export function getLoopSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-loop',
    description: 'Autonomous loop: auto-advance with no user interaction until roadmap complete',
    instructions,
  };
}

export function getLoopCommandTemplate(): CommandTemplate {
  return {
    description: 'Autonomous loop: auto-advance with no user interaction until roadmap complete',
    category: 'Workflow',
    tags: ['bp', 'loop', 'autonomous', 'auto-advance'],
    content: instructions,
  };
}
