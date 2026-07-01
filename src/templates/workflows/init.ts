import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input
- No prior state required (this is the project entry point)
- Node.js 20+ must be installed

## Steps

### Step 1: Initialize or update
Run \`bp init --yes\`. If the CLI says already initialized, run \`bp update\` to refresh platform files instead. Do NOT re-read skeleton files.

### Step 2: Advance
Run \`bp continue\`. The output tells you what to do next (grill if greenfield, brownfield analysis otherwise). Follow the output instructions — do not question or repeat them.

## Guardrails

- Always run \`bp init --yes\` first — it's idempotent for initialized projects (exits with instructions)
- Do not read skeleton contents — trust the tool
- If \`bp continue\` outputs grill steps, directly ask the user for requirements without preamble`;

export function getInitSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-init',
    description: 'Initialize bp project structure and generate platform files',
    instructions,
  };
}

export function getInitCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Init',
    description: 'Initialize bp project structure and generate platform files',
    category: 'Setup',
    tags: ['bp', 'init', 'setup'],
    content: instructions,
  };
}
