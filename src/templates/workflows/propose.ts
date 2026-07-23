import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (required): change name (kebab-case)
- **\`--phase <milestone>/<phase>\`** (optional): reference a roadmap phase

## Steps

## Orchestrator Steps

> These are the steps you (orchestrator) execute in order. \`bp propose\` only outputs these steps — it does not auto-execute.

### Step 0: Risk assessment and level assignment

Assess the change's risk level based on scope and failure cost:

- **Trivial**: single file, docs/config/scaffolding only, no behavior change -> inline execution, no sub-agents
- **Light**: 2-5 files, low-risk behavior change, good test coverage -> single agent, TDD optional
- **Standard**: cross-module, new behavior, medium risk (DEFAULT) -> planner + wave executor + triple review
- **Critical**: involves auth/payment/data-consistency/core-path -> full flow + security audit + human approval gate

Auto-assess based on the user's described scope. If --level <X> provided, use that instead.
Write the level to proposal.md's ## Level section.

**If trivial or light**: may skip Step 1 (grill) per existing lightweight logic. Go directly to Step 2 with a minimal proposal derived from the user's one-line description. Fill template directly, no interview.
**If standard or critical**: continue to Step 1 (relentless interview).
**If critical**: flag for security audit in design.md.

### Step 1: Grill the user on requirements (Skip if Step 0 classified as trivial or light) (RELENTLESS - do NOT skip)

Before writing anything, you must reach FULL shared understanding with the user.
This is NOT a checklist. It is a relentless interview that walks every branch of the decision tree,
resolving dependencies between decisions one by one.

Process:
1. Start with what the user described. Map the decision tree in your mind:
   every choice, dependency, edge case, scope boundary, and unknown.
2. Pick the first unresolved branch. Ask ONE focused question about it.
   **Provide your recommended answer** so the user can just confirm or correct.
3. If the question can be answered by exploring the codebase, explore it yourself - do NOT ask the user.
4. After the user answers, check if their answer opened new branches. If so, ask about those next.
5. Repeat until every branch is resolved and you have shared understanding.

What to grill on (walk every branch):
- **Problem**: What problem does this change solve? Why now?
- **Scope**: What is in scope? What is explicitly excluded? Where does this change stop?
- **Deliverables**: What observable behaviors? What inputs/outputs? What error conditions?
- **Approach**: What technical approach? What alternatives were considered? Why this one?
- **Edge cases**: What happens when input is invalid? Empty? Concurrent? Large scale?
- **Dependencies**: Does this depend on existing code? Other changes? External services?
- **Constraints**: Performance targets? Library choices? Backwards compatibility?
- **Roadmap context**: If --phase provided, how does this align with the phase goal?

**Hard rules:**
- Ask ONE question at a time. Wait for the answer. Do not batch.
- Always provide a recommended answer when one exists.
- Do NOT proceed to Step 2 until you can describe every deliverable without guessing.
- Do NOT use [ASSUMPTION] tags. If you are about to assume, STOP and ask instead.
- If the user says "use your best judgment" on a specific point, you may proceed without asking.

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
