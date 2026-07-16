import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (required): change name (kebab-case)
- **\`--phase <milestone>/<phase>\`** (optional): reference a roadmap phase

## Steps

### Step 1: Discuss with the user

Before writing anything, understand what the user wants to build.

Use \`ask\` to discuss:
- **Problem**: What problem does this change solve? What would the user like to achieve?
- **Scope**: What should be included? What should be explicitly excluded?
- **Deliverables**: What observable behaviors should this change produce? List them as user-facing capabilities.
- **Approach**: Does the user have any preference on how to implement it? Any constraints (tech stack, dependencies, patterns)?
- **Roadmap context**: If \`--phase\` is provided, explain what phase this belongs to and confirm alignment.

Take notes. These will inform the proposal.

### Step 2: Create change directory

\`\`\`bash
mkdir -p bp/changes/$1
\`\`\`

If \`--phase\` is provided, note the milestone/phase for the proposal's Roadmap Reference section.

### Step 3: Write proposal

Get the proposal template and fill it based on the discussion:

1. Run \`bp template proposal --stdout\` to get the template
2. Fill in each section:
   - **Intent**: Capture what the user described as the problem to solve
   - **Scope**: In scope and out of scope from the discussion
   - **Approach**: User's preferred approach if given, or a reasonable high-level approach based on the discussion
   - **Deliverables**: Observable, verifiable capabilities (PR-N). Each must have a SHALL statement and a Verify method.
   - **Roadmap Reference**: If --phase provided, fill in milestone/phase
3. Write to \`bp/changes/$1/proposal.md\`

### Step 4: Verify proposal quality

Before finishing, check:
- [ ] Intent clearly states the problem
- [ ] Scope has both In Scope and Out of Scope sections
- [ ] Each deliverable (PR-N) has a SHALL statement and Verify method
- [ ] No \`{{\` template placeholders remaining
- [ ] PR count ≤ 5 (if more, suggest splitting)
- [ ] The proposal reflects what the user described (not AI guesswork)

### Step 5: Commit and suggest next step

\`\`\`bash
# Update roadmap: If the proposal has \`## Roadmap Reference\`, read \`bp/roadmap.md\`, find the corresponding phase, and add \`- [ ] $1\` to its Changes list if not already present.
git add bp/changes/$1/
bp commit "docs(proposal): $1" --files bp/changes/$1/
\`\`\`

Output:
\`\`\`
Created bp/changes/$1/proposal.md
  Proposal is ready for planning.

  Next: bp plan $1
  (or: bp continue $1)
\`\`\`

## Guardrails

- **ALWAYS discuss with the user before writing.** Do not guess the requirements.
- Do NOT create design.md, tasks.md, or specs/ - that's the planner's job
- Do NOT run bp plan automatically - let the user review the proposal first
- If the user wants to skip proposal review and go straight to planning, they can run bp plan $1 directly
- Architecture decisions and technical design come from the planner, not from propose
`;

export function getProposeSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-propose',
    description: 'Discuss requirements with user, then write change proposal',
    instructions,
  };
}

export function getProposeCommandTemplate(): CommandTemplate {
  return {
    description: 'Discuss requirements with user, then write change proposal',
    category: 'Workflow',
    tags: ['bp', 'propose', 'proposal', 'change', 'requirements'],
    content: instructions,
  };
}
