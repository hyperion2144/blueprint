import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the current project from \`bp state\`

### Prerequisites
- \`bp/requirements.md\` must exist (created by init)
- \`bp/project.yml\` for project context

## Steps

### Step 1: Get context
Run \`bp context grill\` — outputs state and requirements.md path. Read requirements.md.

### Step 2: Explore requirements — one question at a time
Get the requirements template: \`bp template requirements\`. Interview the user relentlessly until shared understanding is reached.

**For EVERY question, use the \`ask\` tool.** Never use plain text for questions.

Each \`ask\` call MUST have:
- **2-5 concrete options** (not "Option A" / "Option B" — each option describes the actual choice)
- **One \`recommended\` answer** (0-indexed — mark your best recommendation)
- Short \`description\` on each option explaining the tradeoff

\`\`\`
ask({
  questions: [{
    id: "platform",
    question: "Which target platform?",
    options: [
      { label: "Web (Canvas + TypeScript)", description: "Zero install, fastest iteration, Vite + Vitest" },
      { label: "CLI/Terminal (TUI)", description: "Node.js only, no browser needed" },
      { label: "Desktop (Electron/Tauri)", description: "Native window, offline-first" },
    ],
    recommended: 0
  }]
})
\`\`\`

Rules:
1. **One question per \`ask\` call.** Never batch multiple questions in one \`ask\`.
2. **Recommend first.** Always mark one option as \`recommended\` with brief rationale in the description.
3. **Explore codebase first** if the answer can be found in existing files.
4. **Walk each branch** of the decision tree — resolve dependencies one by one.

Use the 5W1H framework to discover what to ask:
- **What** — core goals and value proposition
- **Who** — target users, their roles and workflows
- **Where** — deployment environment, platform constraints
- **When** — timeline, phases, priorities
- **Why** — business motivation, success metrics
- **How** — technical preferences, non-functional requirements

### Step 3: Record decisions incrementally
After each consensus point, write it to \`bp/requirements.md\` immediately — do not batch at the end.

### Step 4: Confirm consensus
Review requirements.md with the user. Ensure no ambiguity remains. Mark unresolved items as \`[TODO: decide]\`.

### Step 5: Commit
\`\`\`bash
bp commit "docs: complete requirements" --files "bp/requirements.md" --scope docs --record
\`\`\`

### Step 6: Advance
Run \`bp continue\` to proceed to the research phase.

## Output
- \`bp/requirements.md\` — populated with agreed requirements

## Guardrails
- No code is written during grill — this is pure exploration
- Do not skip questions that seem obvious — hidden assumptions cause rework
- Record decisions as they are made, not at the end
- If the user cannot answer, mark \`[TODO: decide]\` and move on`;

export function getGrillSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-grill',
    description: 'Requirements exploration — one question at a time, provide recommendations',
    instructions,
  };
}

export function getGrillCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Grill',
    description: 'Requirements exploration — one question at a time, provide recommendations',
    category: 'Discovery',
    tags: ['bp', 'grill', 'requirements', 'discovery'],
    content: instructions,
  };
}
