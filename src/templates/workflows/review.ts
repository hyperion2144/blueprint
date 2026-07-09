import { ORCHESTRATOR_RULE } from '../types.js';
import { CLASSIFY_CHANGE, CHANGE_NAME_RESOLVE, COMMIT_ADVANCE, REVIEW_LOOPBACK } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`$ARGUMENTS\`** (required) — the change to review. Provided by \`bp continue\` output or user.
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

Issue numbering rules (used in all three review files):
| Prefix | Source | Meaning | Loopback |
|--------|--------|---------|----------|
| R1, R2 | Spec Review | Specification non-compliance | reapply |
| Q1, Q2 | Quality Review | Code quality issues | reapply |
| G1, G2 | Goal Review | Goal not achieved | reapply |
| D1, D2 | Any review | **Design/architecture flaw** — needs redesign, not code fix | **replan** |

**D prefix identification**: Mark as D if the issue cannot be fixed by modifying code alone:
1. SHALL/MUST requires a new module or architecture change
2. Core abstraction/component responsibility is wrong
3. Technology stack does not support requirements
4. Data model does not support planned extensions

Each finding gets a unique number (R1, R2, Q1, Q2, G1, G2, D1, D2...) written in the checklist/Issues table, AND a corresponding \`- [ ]\` entry in the \`## Issues\` section at the bottom.

**If LIGHTWEIGHT — quick checklist:**
- **No code**: write minimal reviews, advance
- **With code**: tsc + vitest must pass; quick scan → write PASS reviews
- Use the numbering rules above when writing issues

**If FULL — dispatch reviewer sub-agent:**
1. Run \`bp dispatch reviewer --change $1\`
2. Call the tool once. Prompt: run spec-review → quality-review → goal-review sequentially, then commit all three files.
   Include the numbering rules (R/Q/G/D prefixes, D identification criteria, Issues section).
3. Output: spec-review.md, quality-review.md, goal-review.md in change directory.

### Step 3: Collect and classify issues
Read all three review files. Extract all \`## Issues\` entries.

**Check for D-prefixed issues** (design/architecture problems):
- Search for \`- [ ] D\` in all three files
- If any D issue exists → design flaw identified

### Step 4: Route based on findings

**If any D issue found** → **replan** (design loopback):
\`\`\`bash
bp continue change [BP:CHANGE_NAME] --command replan
\`\`\`
The design needs to be reworked before code fixes make sense.

**If only R/Q/G issues found and any report is FAIL or NEEDS_REVISION** → **reapply** (code fix loopback):
\`\`\`bash
bp continue change [BP:CHANGE_NAME] --command reapply
\`\`\`

**If all three reports PASS** → commit review files → advance to archive.
\`\`\`bash
bp commit "docs(review): triple review for [BP:CHANGE_NAME]" --files "spec-review.md,quality-review.md,goal-review.md" --scope review --record
\`\`\`

${REVIEW_LOOPBACK}

### Step 5: In-place re-review (Fix mode only)

Read original review files + review-task.md. The issues in the original review files should still have \`- [ ]\` entries.

**Mark fixed issues:**
- For each issue referenced in review-task.md as fixed → find in \`## Issues\` and change \`- [ ]\` to \`- [x]\`
- Do NOT modify the report content above Issues (no \`已修复\` annotations needed)

**New issues found:**
- Continue numbering from the existing highest number
- Add new entries to the report content AND to \`## Issues\` as \`- [ ]\`
- New D issues → use D prefix, continue D numbering

**After in-place update:**
- Check if \`## Issues\` has any remaining \`- [ ]\` → if yes, write new review-task.md → loop back
- If all \`- [x]\` → commit → advance to archive
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
