import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input
- User has already run \`bp init\`. All project settings (profile, spec stack, platform, release template) are configured.
- \`bp/state.md\` and \`bp/project.yml\` exist and are fully configured.

## Steps

### Step 1: Check project type
Run \`bp config list\` — read the \`context\` field. If it contains \`[BROWNFIELD]\`, this is an existing project.

**Greenfield (no \`[BROWNFIELD]\` tag):**
- "This is a greenfield project. All settings are configured. Let's start building."
- Skip to Step 3.

**Brownfield (\`[BROWNFIELD]\` tag present):**
Continue to Step 2.

### Step 2: Brownfield scan
1. Read \`bp/codebase/stack.md\` and \`bp/codebase/architecture.md\` (created by init CLI scan).
2. Read \`bp/specs/<domain>/spec.md\` — these are the initial spec skeletons from the tech stack template.
3. Dispatch sub-agents:
   - Run \`bp dispatch codebase-mapper\` — outputs the sub-agent tool and its parameters. Call it once. Prompt:
     - Task: deep-analyze the existing code (modules, patterns, tech debt)
     - Read: bp/codebase/stack.md, bp/codebase/architecture.md, bp/conventions/coding-standards.md
     - Output: codebase-stack.md, codebase-architecture.md, codebase-structure.md, codebase-conventions.md, codebase-testing.md, codebase-integrations.md, codebase-concerns.md
   - Run \`bp dispatch spec-bootstrapper\` — outputs the sub-agent tool and its parameters. Call it once. Prompt:
     - Task: extract behavioral contracts from existing code
     - Read: bp/specs/<domain>/spec.md, bp/conventions/coding-standards.md
     - Output: bp/specs/<domain>/spec.md (updated with extracted Requirements + Scenarios)

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
    description: 'Brownfield scan — analyze existing codebase and extract initial specs',
    category: 'Setup',
    tags: ['bp', 'init', 'brownfield', 'codebase'],
    content: instructions,
  };
}
