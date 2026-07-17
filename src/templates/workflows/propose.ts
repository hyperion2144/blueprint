import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (required): change name (kebab-case)
- **\`--phase <milestone>/<phase>\`** (optional): reference a roadmap phase

## Steps

### Step 1: Clarify requirements with the user (ITERATIVE - do NOT skip)

Before writing anything, you must reach FULL agreement with the user on what to build.
This is NOT a single Q&A round. It is an iterative loop: ask -> research -> find gaps -> ask again.

Use \`ask\` to discuss:
- **Problem**: What problem does this change solve? What would the user like to achieve?
- **Scope**: What should be included? What should be explicitly excluded?
- **Deliverables**: What observable behaviors should this change produce? List them as user-facing capabilities.
- **Approach**: Does the user have any preference on how to implement it? Any constraints?
- **Roadmap context**: If \`--phase\` is provided, explain what phase this belongs to and confirm alignment.

Take notes. These will inform the proposal.

### Step 1b: Research existing code (do this yourself, do NOT ask)

Research the current state of the codebase:
- Read source files related to what the user described
- Check \`bp/specs/<domain>/spec.md\` for existing behavioral contracts that this change might modify
- Use \`grep\` to find existing implementations of similar features
- Read the project's dependency and config files to understand existing dependencies

This research ensures your proposal fits into the existing codebase.

### Step 1c: Gap analysis and follow-up questions (MANDATORY - not optional)

After research, you MUST assess EACH potential deliverable (PR-N) for ambiguity.
For EACH deliverable, answer these 4 questions. If you cannot answer any of them, you MUST ask the user:

1. **What exactly does it do?** (concrete behavior, not "support auth" but "validate JWT tokens and reject expired ones")
2. **What is explicitly NOT included?** (scope boundary - e.g., "no OAuth, only JWT")
3. **What are the inputs and outputs?** (data flow, error conditions)
4. **Does existing code already partially implement this?** (if so, extend or rewrite?)

If ANY answer is unclear, use \`ask\` to clarify. Common patterns:
- User described a feature but didn't specify the approach -> ask which approach they prefer
- User described a capability but didn't specify requirements -> ask for clarity
- User said "improve performance" -> ask "Which specific operation? What's the target?"
- Research shows existing code already partially implements the feature -> ask: "Extend existing or rewrite?"

**Loop back**: After the user answers, go back to Step 1b (research again if the answer revealed new context),
then re-assess. Repeat until ALL deliverables pass the 4-question check.

### Step 1d: Hard exit gate - do NOT proceed to Step 2 until ALL pass

Before writing the proposal, verify EACH deliverable (PR-N) has:
- **Concrete behavior**: Can you describe what the system does in one sentence without using vague words ("support", "handle", "manage")?
- **Clear scope boundary**: Can you state what is explicitly NOT included?
- **Clear inputs/outputs**: Can you name the input data and the expected output/error?
- **No ambiguity remaining**: If you have to guess or assume, you have NOT reached agreement.

**CRITICAL: Do NOT use [ASSUMPTION] tags as a substitute for asking.** If you are about to write
\`[ASSUMPTION: xxx]\`, STOP. Ask the user instead. Assumptions are failure modes, not shortcuts.
The only exception: the user explicitly said "use your best judgment" on a specific point.

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
- [ ] No template placeholders remaining
- [ ] PR count <= 5 (if more, suggest splitting)
- [ ] The proposal reflects what the user described (not AI guesswork)

### Step 5: Commit and suggest next step

\`\`\`bash
# Update roadmap: If proposal has \`## Roadmap Reference\`, read \`bp/roadmap.md\`, find corresponding phase, add \`- [ ] $1\` to its Changes list if not already present.
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
    description: 'Discuss requirements with user, research code, then write change proposal',
    instructions,
  };
}

export function getProposeCommandTemplate(): CommandTemplate {
  return {
    description: 'Discuss requirements with user, research code, then write change proposal',
    category: 'Workflow',
    tags: ['bp', 'propose', 'proposal', 'change', 'requirements'],
    content: instructions,
  };
}
