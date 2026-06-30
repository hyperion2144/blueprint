import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the current project from \`specwf state\`

### Prerequisites
- \`specwf/requirements.md\` must exist (created by init)
- \`specwf/project.yml\` for project context

## Steps

### Step 1: Get context
Run \`specwf context grill\` — outputs JSON with state and requirements.md path. Read requirements.md.

### Step 2: Explore requirements — one question at a time
Interview the user relentlessly until shared understanding is reached. Follow these rules:

1. **One question at a time.** Never batch multiple questions.
2. **Provide your recommended answer** for each question, then ask if they agree.
3. **Explore the codebase first** if the question can be answered by reading existing code or docs.
4. **Walk each branch of the decision tree** — resolve dependencies between decisions one by one.

Use the 5W1H framework:
- **What** — core goals and value proposition
- **Who** — target users, their roles and workflows
- **Where** — deployment environment, platform constraints
- **When** — timeline, phases, priorities
- **Why** — business motivation, success metrics
- **How** — technical preferences, non-functional requirements

### Step 3: Record decisions incrementally
After each consensus point, write it to \`specwf/requirements.md\` immediately — do not batch at the end.

### Step 4: Confirm consensus
Review requirements.md with the user. Ensure no ambiguity remains. Mark unresolved items as \`[TODO: decide]\`.

### Step 5: Advance
Run \`specwf continue\` to proceed to the research phase.

## Output
- \`specwf/requirements.md\` — populated with agreed requirements

## Guardrails
- No code is written during grill — this is pure exploration
- Do not skip questions that seem obvious — hidden assumptions cause rework
- Record decisions as they are made, not at the end
- If the user cannot answer, mark \`[TODO: decide]\` and move on`;

export function getGrillSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-grill',
    description: 'Requirements exploration — one question at a time, provide recommendations',
    instructions,
  };
}

export function getGrillCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Grill',
    description: 'Requirements exploration — one question at a time, provide recommendations',
    category: 'Discovery',
    tags: ['specwf', 'grill', 'requirements', 'discovery'],
    content: instructions,
  };
}
