import { CONTEXT_JSONL_REMINDER } from './shared.js';
import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `${CONTEXT_JSONL_REMINDER}## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, use the most recently applied change.
- **\`--fix\`** (optional): re-review mode — reviewer marks resolved issues in existing review.md.

## Prerequisites

- Code is implemented (tasks.md has [x] entries with commit hashes)
- Build check and test suite pass (per bp/config.yaml stack)
- In --fix mode: \`review.md\` exists with unresolved issues, fixes have been applied


## Orchestrator Steps

> These are the steps you (orchestrator) execute in order. \`bp review\` only outputs these steps — it does not auto-execute. Review is done by reviewer sub-agent.

## Steps

### Step 1: Resolve change name and paths

Same as plan workflow Step 1.

### Step 2: Pre-review verification

Run before dispatching reviewer:
\`\`\`bash
# Run the project's build check and test suite.
# Read bp/config.yaml for the tech stack and test framework.
# Examples by stack:
#   TypeScript: tsc --noEmit && npx vitest run
#   Python:     mypy . && pytest
#   Go:         go build ./... && go test ./...
#   Rust:       cargo build && cargo test
#   Java:       mvn compile && mvn test
\`\`\`

If build or tests fail: do NOT dispatch reviewer. Report the failures and suggest \`bp apply --fix\` to fix them first.

### Step 3: Classify change (lightweight vs full)

- **Lightweight** (all non-behavior tasks, no delta specs): orchestrator does a quick review directly
  - Check: all tasks [x], tests pass, no obvious issues
  - Write a simplified review.md (may skip spec review if no delta specs)
- **Full** (any behavior task, has delta specs): dispatch reviewer sub-agent

### Step 4: Dispatch reviewer (Full mode)

**Do NOT write review.md yourself. Dispatch reviewer sub-agent.**

1. Prepare reviewer context:
   - Change name and directory path
   - List of files to read: proposal.md, design.md, tasks.md, specs/<domain>/spec.md, bp/specs/<domain>/spec.md, bp/conventions/coding.md
   - Instruction: "Read the reviewer agent prompt, then perform triple review and write review.md"
   - In --fix mode: "Read the reviewer agent prompt (Fix Mode section), verify each [~] issue before marking [x], follow the three-state process ([ ]→[~]→[x])"

2. Dispatch via task tool:
   - Agent type: bp-reviewer (or default task agent with reviewer prompt injected)
   - Fresh context: yes
   - Isolated: no (reviewer is read-only on source code, writes only review.md)

3. Wait for reviewer to complete.

### Step 5: Read review.md and route

After reviewer completes:

1. Read \`bp/changes/$1/review.md\`
2. Extract the Overall Verdict and Issues list
3. Route based on findings:

**If Overall Verdict is PASS (zero issues):**
\`\`\`
Review PASSED for $1
  All three dimensions clean.

  Next: bp archive $1
\`\`\`

**If D-prefixed issues exist (design flaw):**
\`\`\`
Review FAILED for $1
  D issues found (design/architecture problems):
  - D1: <list actual D-issue descriptions from review.md>

  These require redesign, not code fix.
  Next: bp plan --fix $1
\`\`\`

**If only R/Q/G issues (code fixable):**
\`\`\`
Review NEEDS_REVISION for $1
  Issues found (code fixable):
  - R1: <list actual R-issue descriptions from review.md>
  - Q1: <list actual Q-issue descriptions from review.md>
  - G1: <list actual G-issue descriptions from review.md>

  Next: bp apply --fix $1
\`\`\`


**If [FUSE] diminishing returns detected:**
Do NOT auto-route to another fix. Instead:
1. Read review.md Issues section to understand remaining open findings
2. Present remaining issues to user for human verification
3. If user confirms all resolved: write \`## Human Verdict: PASS\` below the Issues section in review.md, then run \`bp archive $1\`
4. If user finds new problems or disagrees with resolution: run \`bp apply --fix $1\` (this resets the review round counter for fuse detection)

### Step 6: Commit review.md

\`\`\`bash
# Update roadmap: If the change is linked to a roadmap phase, update it to \`- [x] $1 (reviewed YYYY-MM-DD)\`.
git add .
bp commit "docs(review): triple review for $1" --files bp/changes/$1/review.md

# Record execution metadata (v2.1 P5)
# Orchestrator should write .meta/reviewer-run-N.json after reviewer completes
- Do NOT run bp archive automatically - let the user review the findings first.
- **Context is auto-injected by the OMP Extension.** Do NOT call \`bp context review\`; the extension already supplies the same material at every turn.
- **Fix loop limit: max config.budget.max_review_rounds rounds (default 3).** If the change has been through that many fix rounds (count re-reviews in review.md Review History) and issues still persist, the diminishing-returns fuse may trigger — see [FUSE] recovery path below. Do not auto-route to another fix beyond the limit — escalate for human decision.
- **Level-aware review**: Trivial = orchestrator quick check (no sub-agent). Light = optional review. Standard = triple review. Critical = triple review + security audit + human approval before archive.
- **Critical approval gate (v2.1 7.2.5)**: Critical-level changes require explicit approval. If config.approvers is non-empty, only listed approvers can PASS a Critical review. In CI mode, Critical changes always exit 1 (require interactive approval).
- **CI mode (--ci)**: When run with --ci, skip all human-confirmation steps. If review verdict is not PASS, the command exits 1 immediately. No fix loop in CI -- failures must be fixed in a separate interactive session.
- **Level-aware CI**: Critical changes require human approval even in CI mode (exit 1 with 'Critical change requires human review'). Trivial/Light changes auto-pass in CI if tests pass.
- **v2.1 P2 dynamic downgrade**: If first review round found no BLOCKER, second round reviewer may use a faster model (config.resolveModelsForLevel with round=2). If BLOCKER found after downgrade, upgrade back and mark degradation_failed.
`;

export function getReviewSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-review',
    description: 'Triple review — with fix loopback and in-place re-review support',
    instructions,
  };
}

export function getReviewCommandTemplate(): CommandTemplate {
  return {
    description: 'Triple review — with fix loopback and in-place re-review support',
    category: 'Workflow',
    tags: ['bp', 'review', 'quality', 'specs', 'sub-agent', 'loopback'],
    content: instructions,
  };
}
