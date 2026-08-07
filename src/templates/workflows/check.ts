/**
 * check workflow template — the change-verification step.
 *
 * Owns the full verify → fix → full re-review loop. The review artifact
 * keeps its historical name `review.md` (the artifact name is NOT renamed).
 */

import { CONTEXT_JSONL_REMINDER } from './shared.js';
import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `${CONTEXT_JSONL_REMINDER}## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, use the most recently applied change.
- **\`--ci\`** (optional): CI mode — non-interactive, non-PASS exits 1 immediately.

## Prerequisites

- Code is implemented (tasks.md has [x] entries with commit hashes)
- Build check and test suite pass (per bp/config.yaml stack)

## Steps

> These are the steps you (orchestrator) execute in order. \`bp check\` only outputs these steps — it does not auto-execute. Review is done by reviewer sub-agent.

### Step 1: Resolve change name and paths

Same as plan workflow Step 1.

### Step 2: Pre-check verification

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

If build or tests fail: do NOT dispatch reviewer. Report the failures and stop — fix them before checking.

### Step 3: Classify change (lightweight vs full)

- **Lightweight** (all non-behavior tasks, no delta specs): orchestrator does a quick review directly — verify all tasks [x], tests pass, no obvious issues, then write a simplified review.md.
- **Full** (any behavior task, has delta specs): dispatch reviewer sub-agent.

### Step 4: Dispatch reviewer for a full triple review

**Do NOT write review.md yourself. Dispatch reviewer sub-agent.**

1. Prepare reviewer context:
   - Change name and directory path
   - Files to read: proposal.md, design.md, tasks.md, specs/<domain>/spec.md, bp/specs/<domain>/spec.md, bp/conventions/coding.md
   - Instruction: "Read the reviewer agent prompt, then perform the full triple review (spec + quality + goal gates) and write review.md"

2. Dispatch via task tool:
   - Agent type: bp-reviewer (or default task agent with reviewer prompt injected)
   - Fresh context: yes
   - Isolated: no (reviewer is read-only on source code, writes only review.md)

3. Wait for reviewer to complete.

### Step 5: Read review.md and route

After reviewer completes, read \`bp/changes/$1/review.md\` and extract the Overall Verdict and Issues list.

**If Overall Verdict is PASS (zero issues):**

Present the verdict and ask the user: "Review PASSED. Shall I archive this change?" On confirmation, run \`bp archive $1\`. Do NOT auto-archive.

**If non-PASS (FAIL / NEEDS_REVISION, any open \`- [ ]\` R/Q/G/D issue):**

Dispatch the fixer to repair the change:
\`\`\`bash
bp dispatch fixer --change $1
\`\`\`

The fixer repairs proposal, design, and implementation per the review issues. After it completes, re-dispatch the reviewer for a **full re-review of the entire change** (all three gates — spec, quality, goal). Do NOT re-check only the fixed issues.

**If [FUSE] diminishing returns detected:**

Do NOT auto-route to another fix. Present the remaining issues for human verification. If the user confirms all resolved, write \`## Human Verdict: PASS\` below the Issues section in review.md and run \`bp archive $1\`.

### Step 6: Commit review.md

\`\`\`bash
bp commit -m "docs(review): triple review for $1" --files bp/changes/$1/review.md
\`\`\`

## Output

- The \`bp/changes/$1/review.md\` artifact written by the reviewer sub-agent.
- A verdict readout and, on PASS, the archive confirmation flow.

## Guardrails

- **Context is auto-injected by the OMP Extension.** Do NOT call \`bp context check\`; the extension already supplies the same material at every turn.
- **Fix loop limit: max config.budget.max_review_rounds rounds (default 3).** Count re-reviews in review.md Review History; if issues persist past the limit, trigger the [FUSE] recovery path above.
- **Every reviewer run is a full triple review** (spec + quality + goal gates). There is no fix-mode or diff-only re-check.
- **Level-aware review**: Trivial = orchestrator quick check (no sub-agent). Light = optional review. Standard = triple review. Critical = triple review + security audit + human approval before archive.
- **Critical approval gate**: Critical-level changes require explicit approval. If config.approvers is non-empty, only listed approvers can PASS a Critical review.
- **CI mode (--ci)**: skip human-confirmation steps; if the verdict is not PASS, exit 1 immediately.
- **Do NOT run bp archive automatically** — the user approves archiving.
`;

export function getCheckSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-check',
    description: 'Triple check — full verify + fixer loopback + full re-review',
    instructions,
  };
}

export function getCheckCommandTemplate(): CommandTemplate {
  return {
    description: 'Triple check of a change - full verify + fixer loopback + full re-review',
    category: 'Workflow',
    tags: ['bp', 'check', 'quality', 'specs', 'sub-agent', 'fixer', 'loopback'],
    content: instructions,
  };
}
