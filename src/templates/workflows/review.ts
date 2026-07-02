import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to review. Provided by \`bp continue\` output or user.
- If no change name is available, check the \`pending\` array from \`bp context <step>\` JSON output, then ask the user.

### Prerequisites
- Apply phase complete: implementation code, tests, summary.md

## Steps

### Step 0: Classify change
Read \`tasks.md\` and check task types:
- **Lightweight**: ALL tasks are type: config | docs | refactor | scaffolding — no type:behavior
- **Full**: any type:behavior tasks

### Step 1: Resolve change name and get context
If a change name was provided: use it directly. If not: run \`bp state\`, list pending changes with status \`applying\`, ask the user to pick. Then run \`bp context review\` to get the file manifest. Read all listed files.

### Step 2: Execute review

**If LIGHTWEIGHT — quick checklist (skip sub-agents):**

First, check if this change produced any code:
- **No code (pure config/docs)**: write one-line review files and advance — no tsc/vitest needed
  - \`spec-review.md\`: "No delta-specs — config/doc change"
  - \`quality-review.md\`: "No code changes — skip"
  - \`goal-review.md\`: verify proposal must_haves are met, PASS or PARTIAL
- **With code (refactor/scaffolding)**: run checks below
  - \`npx tsc --noEmit\` — must pass
  - \`npx vitest run\` — must pass (if tests exist)
  - Quick scan for obvious issues → write reviews with PASS if clean
  - All three review files required even if light — never leave a blank review

**If FULL — dispatch parallel review sub-agents:**
Run \`bp dispatch reviewer --change <change-name>\` for platform-specific dispatch instructions. Dispatch three in parallel, each with a different role: spec-review, quality-review, goal-review.

Construct each sub-agent prompt:
- Task: review the change according to assigned role
- Read: proposal.md, delta-specs, design.md, implementation
- Output: spec-review.md | quality-review.md | goal-review.md to bp/changes/<change-name>/
- The sub-agent's system prompt (.omp/agents/bp-reviewer.md) contains per-role review checklists.

### Step 3: Aggregate results
After all three complete, check each report:
- \`spec-review.md\`: Verify spec.md is not empty template (has ≥1 concrete SHALL/MUST, not \`<name>\`/\`<behavior>\` placeholders). Then check all SHALL/MUST covered. BLOCKERs?
- \`quality-review.md\`: any BLOCKERs or MAJOR issues?
- \`goal-review.md\`: all goals ACHIEVED?

### Step 4: Handle findings
- Auto-fixable issues → fix and re-verify
- Architecture-level issues → pause and ask user
- No BLOCKERs → advance

### Step 5: Commit
\`\`\`bash
bp commit "docs(review): triple review for <change-name>" --files "bp/.../<change-name>/spec-review.md,bp/.../<change-name>/quality-review.md,bp/.../<change-name>/goal-review.md" --scope docs --record
\`\`\`

### Step 6: Advance
Run \`bp continue\` to proceed to verify.

## Guardrails
- FULL: dispatch 3 reviewer sub-agents in parallel (spec/quality/goal)
- LIGHTWEIGHT: quick checklist — no sub-agents needed
- Review gate config in project.yml \`review.gate\`
- Findings: BLOCKER (must fix), FLAG (should fix), NOTE (info)`;

export function getReviewSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-review',
    description: 'Triple review — dispatch reviewer sub-agents in parallel',
    instructions,
  };
}

export function getReviewCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Review',
    description: 'Triple review — dispatch reviewer sub-agents in parallel',
    category: 'Workflow',
    tags: ['bp', 'review', 'quality', 'specs', 'sub-agent'],
    content: instructions,
  };
}
