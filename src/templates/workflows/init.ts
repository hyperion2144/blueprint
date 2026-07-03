import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input
- User has already run \`bp init\`. All project settings (profile, spec stack, platform, release template) are configured.
- \`bp/state.md\` and \`bp/project.yml\` exist and are fully configured.

## Steps

### Step 1: Check project type
Run \`bp config list\` — read the \`spec.stack\` field. If \`generic\`, this is a greenfield project with no detected codebase.

**Greenfield (no existing code):**
- "This is a greenfield project. All settings are configured. Let's start building."
- Skip to Step 3.

**Brownfield (existing code detected):**
Continue to Step 2.

### Step 2: Brownfield scan
1. Run \`bp config list\` to confirm \`spec.stack\` matches the actual codebase (not \`generic\`). If it's still \`generic\`, the CLI auto-detection may have failed — report this to the user, then advance anyway.
2. Read \`bp/codebase/stack.md\` and \`bp/codebase/architecture.md\` (created by init CLI scan).
3. Read \`bp/specs/<domain>/spec.md\` — these are the initial spec skeletons from the tech stack template.
4. Dispatch \`bp-codebase-mapper\` and \`bp-spec-bootstrapper\` sub-agents:
   - \`bp-codebase-mapper\`: deep-analyze the existing code (modules, patterns, tech debt)
   - \`bp-spec-bootstrapper\`: extract behavioral contracts from existing code into \`bp/specs/<domain>/spec.md\`

### Step 3: Advance
Run \`bp continue\`. The output routes to grill (for requirements exploration).

## Guardrails
- NEVER re-ask configuration questions — the init CLI already handled profile, spec stack, platform, release template
- NEVER run \`bp init\` or \`bp update\` — user did this already
- If greenfield: advance immediately, no questions needed`;

export function getInitSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-init',
    description: 'Brownfield scan — analyze existing codebase and extract initial specs',
    instructions,
  };
}

export function getInitCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Init',
    description: 'Brownfield scan — analyze existing codebase and extract initial specs',
    category: 'Setup',
    tags: ['bp', 'init', 'brownfield', 'codebase'],
    content: instructions,
  };
}
