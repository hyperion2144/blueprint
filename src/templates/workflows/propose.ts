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

Auto-assess from the user's described scope (or use \`--level <X>\` if provided) and write it to proposal.md's \`## Level\` section. **Every change is grilled in Step 1 — the level scales grilling depth, never whether it happens** (a trivial change is one frontier round, not zero); critical is flagged for a security audit in design.md.

### Step 1: Grill the user (grilling skill — design tree, frontier, rounds)

> **No level bypasses the grill.** Trivial/light changes are not written from a one-line description — their frontier is small but never empty. The level only tells you how deep the design tree goes.

Follow the **grilling skill**: map the change as a **design tree** — every decision branches into the decisions that hang off it (problem, scope in/out, deliverables, approach + alternatives, research needed, edge cases, dependencies, constraints, roadmap context). Work the tree in **rounds**:

1. **Compute the frontier** — every decision whose prerequisites are already settled: the questions you can ask now without guessing at answers you haven't heard yet.
2. **Ask the whole frontier in one round** — number each question and give your recommended answer, formatted:
   \`\`\`
   ❓ **Q1** - **<question title>**: <question body, including the choices>

   ➡️ <your recommended answer>
   \`\`\`
3. **Wait for the user's answers** before the next round. Each answer reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open this round belongs to a LATER round.
4. **Facts are your job** — when a frontier question needs a fact from the environment (filesystem, codebase, libraries), dispatch a sub-agent to find it; do NOT ask the user for anything you can look up. Don't block on it: only the questions downstream of the lookup wait — ask the rest of the frontier now.
5. **Done when the frontier is empty** — every branch visited, nothing left silently assumed. Do NOT proceed to Step 2 until the user confirms you have reached a shared understanding.

**Hard rules:**
- Ask the WHOLE frontier each round — do NOT trickle questions one-by-one.
- Always provide a recommended answer for each question.
- Do NOT use [ASSUMPTION] tags — if you are about to assume, STOP and ask.
- If the user says "use your best judgment" on a point, you may proceed without asking.

### Step 1b: Technical research

For standard/critical changes, research before writing so findings are captured in the proposal. Skip for trivial/light. Fact-finding sub-agents dispatched during Step 1's grilling continue in the background; finish the remaining research here — read relevant source files, external references mentioned in discussion, callers of code to be changed, and web_search anything unresolved. Document findings as you go (per-PR research goes in the PR's Research field; cross-cutting findings in \`## Research Landscape\`). If information is missing, return to the user with specific questions.

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
