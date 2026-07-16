import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- User has already run \`bp init\`. All project settings (profile, spec stack, platform) are configured.
- \`bp/config.yaml\` exists and is fully configured.

## Steps

### Step 1: Check project type

Read \`bp/config.yaml\` — check the \`context\` field.

**Greenfield (no \`[BROWNFIELD]\` tag):**
- "This is a greenfield project. All settings are configured. Let's start building."
- Skip to Step 3.

**Brownfield (\`[BROWNFIELD]\` tag present):**
Continue to Step 2.

### Step 2: Brownfield scan — specs from code

1. Read \`bp/codebase/\` documents created by init CLI scan
2. Dispatch codebase analysis to understand existing patterns
3. Extract behavioral contracts from existing source code into \`bp/specs/\` directories
4. Commit all spec files

### Step 3: Advance

Run \`bp continue\`. The output routes to the next step (roadmap definition).

## Guardrails

- NEVER re-ask configuration questions — the init CLI already handled profile, spec stack, platform
- NEVER run \`bp init\` or \`bp update\` — user did this already
- Brownfield: specs come from code scanning. Domain names come from source tree structure.
- If greenfield: advance immediately, no questions needed
`;

export function getInitSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-init',
    description: 'Brownfield scan — analyze existing codebase and extract initial specs',
    instructions,
  };
}

export function getInitCommandTemplate(): CommandTemplate {
  return {
    description: 'Brownfield scan — analyze existing codebase and extract initial specs',
    category: 'Setup',
    tags: ['bp', 'init', 'brownfield', 'codebase'],
    content: instructions,
  };
}
