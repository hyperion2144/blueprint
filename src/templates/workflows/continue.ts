import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, the CLI auto-detects.

## Note

> \`bp continue\` auto-detects progress and outputs the next step's workflow instructions. Follow the instructions it outputs.

## What to do

Run the CLI command:

\`\`\`bash
bp continue $ARGUMENTS
\`\`\`

The CLI runs schema-driven detection in code and outputs:
1. Current artifact status (proposal/design/tasks/specs/review existence + task completion count)
2. Next recommended step (command + description)
3. Full workflow instructions for the next step

**Follow the CLI output.** Do not manually check files or determine the next step yourself - the code does it.

## When to use

- After \`bp init\` (CLI detects empty roadmap -> suggests bp roadmap)
- After any step completes (CLI detects next step based on schema)
- When unsure what to do next (CLI shows current progress)

## Guardrails

- The CLI does ALL detection. You just follow its output.
- If the CLI says "Next: bp plan <name>", run the plan workflow instructions it outputs.
- If multiple active changes exist, the CLI lists them. Pick one and re-run \`bp continue <name>\`.
`;

export function getContinueSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-continue',
    description: 'Run bp continue CLI - schema-driven next step detection',
    instructions,
  };
}

export function getContinueCommandTemplate(): CommandTemplate {
  return {
    description: 'Run bp continue CLI - schema-driven next step detection',
    category: 'Workflow',
    tags: ['bp', 'continue', 'progress', 'schema-driven'],
    content: instructions,
  };
}
