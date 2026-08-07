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
- **\`--ci\`** (optional): CI mode — non-interactive, exits 1 immediately on a non-PASS verdict.

## Prerequisites

- Code is implemented (tasks.md \`[x]\` entries with commit hashes).
- Build check and test suite pass (per bp/config.yaml stack).

## Steps

> These are the steps you (orchestrator) execute in order. \`bp check\` only outputs these steps — it does not auto-execute. Review is done by the reviewer sub-agent.

### Step 1: Resolve change name and paths

Same as plan workflow Step 1.

### Step 2: Pre-check verification

Run the project's build and test suite (per bp/config.yaml stack). If build or tests fail, do NOT dispatch the reviewer — report the failures and stop.

### Step 3: Classify change (lightweight vs full)

- **Lightweight** (all non-behavior tasks, no delta specs): orchestrator quick check — verify all tasks \`[x]\`, tests pass, no obvious issues, then write a simplified review.md.
- **Full** (any behavior task, has delta specs): dispatch the reviewer sub-agent.

### Step 4: Dispatch reviewer for a full triple review

**Do NOT write review.md yourself.** Dispatch the reviewer with the change's context files (proposal.md, design.md, tasks.md, delta specs, global specs, coding conventions) and the instruction: "Read the reviewer agent prompt, then perform the full triple review (spec + quality + goal gates) and write review.md". Use a fresh, non-isolated task (the reviewer is read-only and writes only review.md). Wait for completion.

### Step 5: Read review.md and route

Read \`bp/changes/$1/review.md\` and extract the Overall Verdict and Issues list.

**If Overall Verdict is PASS (zero issues):** present the verdict and ask the user: "Review PASSED. Shall I archive this change?" On confirmation, run \`bp archive $1\`. Do NOT auto-archive.

**If non-PASS (FAIL / NEEDS_REVISION, any open \`- [ ]\` R/Q/G/D issue):** dispatch the fixer to repair the change:

\`\`\`bash
bp dispatch fixer --change $1
\`\`\`

The fixer repairs proposal, design, and implementation per the review issues. After it completes, re-dispatch the reviewer for a **full re-review of the entire change** (all three gates — spec, quality, goal). Do NOT re-check only the fixed issues.

**If [FUSE] diminishing returns detected:** do NOT auto-route to another fix. Present the remaining issues for human verification. If the user confirms all resolved, write \`## Human Verdict: PASS\` below the Issues section in review.md and run \`bp archive $1\`.

### Step 6: Commit review.md

\`\`\`bash
bp commit -m "docs(review): triple review for $1" --files bp/changes/$1/review.md
\`\`\`

## Output

- The \`bp/changes/$1/review.md\` artifact written by the reviewer sub-agent.
- A verdict readout and, on PASS, the archive confirmation flow.

## Guardrails

- Fix loop limit: max \`config.budget.max_review_rounds\` rounds (default 3). Count re-reviews in review.md Review History; past the limit, trigger the [FUSE] path above.
- Every reviewer run is a full triple review (spec + quality + goal gates). There is no fix-mode or diff-only re-check.
- Level-aware review: Trivial = orchestrator quick check (no sub-agent); Light = optional; Standard = triple review; Critical = triple review + security audit + human approval before archive.
- Critical approval gate: with non-empty \`config.approvers\`, only listed approvers can PASS a Critical review.
- CI mode (\`--ci\`): skip human-confirmation steps; exit 1 immediately if the verdict is not PASS.
- Do NOT run \`bp archive\` automatically — the user approves archiving.
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
