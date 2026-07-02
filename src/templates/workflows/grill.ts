import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\\\`<idea>\\\`** (optional) — the product idea, feature concept, or brief to grill. If not provided, ask the user: "What are you building? Describe the idea in a few sentences."

### Prerequisites
- \\\`bp/requirements.md\\\` must exist (created by init)
- \\\`bp/project.yml\\\` for project context

## Steps

### Step 1: Get context
Run \\\`bp context grill\\\` — outputs state and requirements.md path. Read requirements.md.

### Step 2: Get the idea
If the user provided an idea in the prompt, use it. If not, use the \\\`ask\\\` tool to get it:
- One question: "What are you building? Describe the idea in a few sentences."
- Input type, no options — let the user describe freely.

### Step 3: Interview relentlessly about this idea

Interview the user relentlessly about every aspect of the idea. All questions must tie back to the idea — clarify, refine, expand, stress-test it. Walk down each branch of the decision tree, resolving dependencies one-by-one.

**For every question, use the \\\`ask\\\` tool.** Never use plain text.
Each \\\`ask\\\` call: 2-5 concrete options, one recommended answer, brief tradeoff per option.

**One question at a time.** Never batch. If the codebase or existing docs can answer the question, explore them instead of asking.

Stop only when all decisions are resolved — no ambiguity remains.

### Step 4: Record decisions incrementally
After each consensus point, write it to \\\`bp/requirements.md\\\` immediately — do not batch at the end.

### Step 4b: Write initial global spec skeleton
Based on requirements, update \\\`bp/specs/<domain>/spec.md\\\` for the primary domain.
Write 2-5 high-level Requirements that capture the core behavioral contract using \\\`### Requirement:\\\` + \\\`#### Scenario: GIVEN/WHEN/THEN\\\` format.
These are INITIAL specs — plan phase will refine them into delta-specs.

### Step 5: Confirm consensus
Review requirements.md. If any ambiguity remains, go back to Step 2. Mark only truly unresolved items as \\\`[TODO: decide]\\\`.

### Step 6: Commit
\\\`\\\`\\\`bash
bp commit "docs: complete requirements" --files "bp/requirements.md" --scope docs --record
\\\`\\\`\\\`

### Step 7: Advance
Run \\\`bp continue\\\` to proceed to the research phase.

## Output
- \\\`bp/requirements.md\\\` — populated with agreed requirements

## Guardrails
- No code is written during grill — pure exploration
- Relentless: don't stop until every decision branch is resolved
- One question per \\\`ask\\\` call; recommended answer always
- Record decisions immediately, not at the end
- If truly stuck, mark \\\`[TODO: decide]\\\` and move on`;

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
