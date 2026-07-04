import { ORCHESTRATOR_RULE } from '../types.js';
import { CLASSIFY_CHANGE, CHANGE_NAME_RESOLVE, COMMIT_ADVANCE, REVIEW_LOOPBACK } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to review. Provided by \`bp continue\` output or user.
- **\`--fix\`** (flag) — set when reviewing after fix-apply. Indicates this is a re-review of fixes.

### Prerequisites
- Apply phase complete: implementation code, tests, summary.md
- If --fix: fix-apply phase complete, review-task.md and original review files exist

## Steps

### Step 0: Determine review mode

Check if \`fix: true\` is present in the bp continue output.

**Normal mode** (first review):
- Proceed to Step 1 below — create three review files from scratch.

**Fix mode** (re-review after fixes):
- Read existing \`spec-review.md\`, \`quality-review.md\`, \`goal-review.md\`
- Read \`review-task.md\` to understand what was fixed
- Proceed to Step 5 (in-place update) — do NOT create new files.

${CLASSIFY_CHANGE}${CHANGE_NAME_RESOLVE('applying', 'review')}

### Step 2: Execute review (Normal mode only)

**If LIGHTWEIGHT — quick checklist:**

- **No code**: write minimal reviews, advance
- **With code**: tsc + vitest must pass; quick scan → write PASS reviews

**If FULL — dispatch reviewer sub-agent:**

1. Run \`bp dispatch reviewer --change <change-name>\`
2. Call the tool once. Prompt: run spec-review → quality-review → goal-review sequentially.
3. Output: spec-review.md, quality-review.md, goal-review.md in change directory.

### Step 3: Aggregate results (Normal mode only)

Check each report for BLOCKERs and MAJOR issues.

### Step 4: Handle findings (Normal mode only)

Classify findings: BLOCKER / FLAG / NOTE.

**If NO BLOCKERs** → commit review files → advance to archive.

**If BLOCKERs exist** → determine loopback type:
- Implementation bugs → **reapply** (fix-apply)
- Architecture/design flaws → **replan** (fix-plan)

${REVIEW_LOOPBACK}

### Step 5: In-place re-review (Fix mode only)

Read original review files + review-task.md. For each finding:

- **Fixed findings**: append \`**✅ 已修复**\` below the finding.
- **Unresolved findings**: keep original status.
- **Code review of fixes**: scan the changed files for new issues.
- **New issues found**: append new findings with continued numbering (e.g. #7, #8), status BLOCKER/FLAG/NOTE.

After in-place update:
- If BLOCKERs remain (original unresolved OR new) → write new review-task.md → loop back
- If no BLOCKERs → commit → advance to archive

${COMMIT_ADVANCE('docs', 'triple review for <change-name>')}

## Guardrails
- FULL: dispatch 1 reviewer sub-agent (all three reviews sequentially)
- Fix mode: update existing files in-place, never create new review files
- Findings: BLOCKER (must fix), FLAG (should fix), NOTE (info)
- Loopback: BLOCKERs → fix-plan or fix-apply → re-review → repeat until clean`;

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
