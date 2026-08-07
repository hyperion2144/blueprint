import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, the CLI auto-detects.

## Steps

> \`bp continue\` auto-detects progress in code and outputs the next step's workflow instructions. Follow the output — do not determine the next step yourself.

1. Run the CLI command:

\`\`\`bash
bp continue $ARGUMENTS
\`\`\`

2. Read its output: current artifact status, the next recommended step (command + description), and the full workflow instructions for that step.
3. Execute the output instructions.

## Output

- Current artifact status (proposal/design/tasks/specs/review existence + task completion count).
- The next recommended step and its full workflow instructions.

## Guardrails

- The CLI does ALL detection; you just follow its output.
- If multiple active changes exist, the CLI lists them — pick one and re-run \`bp continue <name>\`.
- If the CLI says \`Next: bp <step> <name>\`, run the workflow instructions it outputs.
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
