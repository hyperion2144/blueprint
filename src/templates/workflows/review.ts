import { ORCHESTRATOR_RULE } from '../types.js';
import { CLASSIFY_CHANGE, CHANGE_NAME_RESOLVE, COMMIT_ADVANCE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to review. Provided by \`bp continue\` output or user.

### Prerequisites
- Apply phase complete: implementation code, tests, summary.md

## Steps

${CLASSIFY_CHANGE}${CHANGE_NAME_RESOLVE('applying', 'review')}### Step 2: Execute review

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

**If FULL — dispatch review sub-agent:**

1. Run \`bp dispatch reviewer --change <change-name>\` — outputs the sub-agent tool and its parameters.
2. Call the tool it specifies **once**. Set the sub-agent's prompt to:
   - Run all three reviews sequentially: spec-review → quality-review → goal-review
   - Read: delta-specs from specs/, global specs from bp/specs/<domain>/spec.md (<domain> = directory under bp/specs/), proposal.md, design.md, tasks.md
   - Output: spec-review.md, quality-review.md, goal-review.md in the change directory
   - Each review file: overall verdict + numbered findings with file:line references

### Step 3: Aggregate results
After all three complete, check each report:
- \`spec-review.md\`: Verify spec.md is not empty template (has ≥1 concrete SHALL/MUST, not \`<name>\`/\`<behavior>\` placeholders). Then check all SHALL/MUST covered. BLOCKERs?
- \`quality-review.md\`: any BLOCKERs or MAJOR issues?
- \`goal-review.md\`: all goals ACHIEVED?

### Step 4: Handle findings
- Auto-fixable issues → fix and re-verify
- Architecture-level issues → pause and ask user
- No BLOCKERs → advance

${COMMIT_ADVANCE('docs', 'triple review for <change-name>')}

## Guardrails
- FULL: dispatch 1 reviewer sub-agent (executes all three reviews sequentially)
- LIGHTWEIGHT: quick checklist — no sub-agents needed
- Review gate config in project.yml \`review.gate\`
- Findings: BLOCKER (must fix), FLAG (should fix), NOTE (info)`;

export function getReviewSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-review',
    description: 'Triple review — spec/quality/goal (parallel sub-agents for Full changes)',
    instructions,
  };
}

export function getReviewCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Review',
    description: 'Triple review — spec/quality/goal (parallel sub-agents for Full changes)',
    category: 'Workflow',
    tags: ['bp', 'review', 'quality', 'specs', 'sub-agent'],
    content: instructions,
  };
}
