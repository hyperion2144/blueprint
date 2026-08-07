import { CONTEXT_JSONL_REMINDER } from './shared.js';
import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `${CONTEXT_JSONL_REMINDER}## Input

- **\`$ARGUMENTS\`** (required): change name (kebab-case)
- **\`--phase <milestone>/<phase>\`** (optional): reference a roadmap phase

## Steps

## Orchestrator Steps

> These are the steps you (orchestrator) execute in order. \`bp propose\` only outputs these steps — it does not auto-execute.

### Step 0: Risk assessment and level assignment

Assess risk and assign a level:
- **Trivial**: single file, docs/config/scaffolding only, no behavior change → inline execution, no sub-agents.
- **Light**: 2-5 files, low-risk behavior, good test coverage → single agent, TDD optional.
- **Standard**: cross-module, new behavior, medium risk (DEFAULT) → planner + wave executor + triple review.
- **Critical**: auth/payment/data-consistency/core-path → full flow + security audit + human approval gate.

Auto-assess from the user's described scope (or use \`--level <X>\` if provided) and write it to proposal.md's \`## Level\` section. Trivial/light may skip Step 1; standard/critical proceed to grill; critical is flagged for a security audit in design.md.

### Step 1: Grill the user (grilling method — one question at a time, recommended answer, resolve every branch)

> **Skip for trivial/light changes** (Step 0): go directly to Step 2 and fill the template from the user's one-line description — no interview.

Follow the **grilling method**: ask ONE question at a time, always provide a recommended answer, and resolve every decision-tree branch before proceeding. Map the decision tree in your mind (choices, dependencies, edge cases, scope boundaries, unknowns), then walk each branch: pick the first unresolved branch, ask ONE focused question with your recommended answer, and check whether the answer opens new branches. If a question is answerable by exploring the codebase, explore it yourself — do NOT ask the user. Repeat until every branch is resolved.

Grill on: problem, scope (in/out), deliverables (observable behaviors, inputs/outputs, error conditions), approach + alternatives, research needed, edge cases, dependencies, constraints, and roadmap context (if \`--phase\` given).

**Hard rules:**
- Ask ONE question at a time. Wait for the answer. Do not batch.
- Always provide a recommended answer when one exists.
- Resolve every branch before proceeding — do NOT proceed until you can describe every deliverable without guessing.
- Do NOT use [ASSUMPTION] tags — if you are about to assume, STOP and ask.
- If the user says "use your best judgment", you may proceed without asking.

### Step 1b: Technical research

For standard/critical changes, research before writing so findings are captured in the proposal. Skip for trivial/light. Read relevant source files, external references mentioned in discussion, callers of code to be changed, and web_search anything unresolved. Document findings as you go (per-PR research goes in the PR's Research field; cross-cutting findings in \`## Research Landscape\`). If information is missing, return to the user with specific questions.

### Step 2: Create change directory

\`\`\`bash
mkdir -p bp/changes/$1
\`\`\`

If \`--phase\` is provided, note the milestone/phase for the proposal's Roadmap Reference section.

### Step 3: Write the detailed proposal from the grilling output

Fetch the proposal template AFTER grilling completes and fill it **from the grilling output** — capture every grilled detail; if the template has no section for a detail, extend it.

1. Run \`bp template proposal --stdout\`.
2. Fill EVERY section from the grilling output:
   - **Intent**: the problem, why now, what triggered the change — the permanent record.
   - **Scope (In/Out)**: precise — "Support GitHub OAuth login", not "improve auth".
   - **Research Landscape**: only when one investigation affected multiple PR-Ns.
   - **Approach**: high-level strategy; per-deliverable breakdown goes in each PR-N's Rationale.
   - **Deliverables (PR-N)**: the core — fill ALL sub-fields: Behavior (SHALL statement), Rationale (WHY — pain points, tradeoffs, decision context), Research (from Step 1b), Alternatives Considered, Risks & Mitigations, Verify, Files.
   - **Dependencies / Roadmap Reference**: fill if applicable.
3. Write to \`bp/changes/$1/proposal.md\`.

### Step 4: Verify proposal quality

- Intent states the problem with full context.
- Scope has both In Scope and Out of Scope.
- Each PR-N has ALL sub-fields (Behavior, Rationale, Verify) plus Research/Alternatives/Risks when discussed.
- No unreplaced template placeholders.
- PR count <= 5 (suggest splitting if more).
- The proposal captures the user's actual requirements, not AI guesswork.

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

## Output

- \`bp/changes/$1/proposal.md\` — the detailed proposal written from the grilling output.

## Guardrails

- ALWAYS discuss with the user before writing — do not guess the requirements.
- ALWAYS research what was discussed — Step 1b is mandatory for standard/critical changes.
- DO write the proposal in detail — it is the permanent record; lost details cannot be recovered.
- Do NOT create design.md, tasks.md, or specs/ — that's the planner's job.
- Do NOT run bp plan automatically — let the user review the proposal first (they can run bp plan $1 directly to skip).
- Architecture decisions and technical design come from the planner, not from propose.
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
