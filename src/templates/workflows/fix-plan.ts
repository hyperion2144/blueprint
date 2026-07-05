import { ORCHESTRATOR_RULE } from '../types.js';
import { RESOLVE_PATHS, READ_CONTEXT, CHANGE_NAME_RESOLVE, COMMIT_ADVANCE } from './shared.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

### Parameters
- **\`$ARGUMENTS\`** (required) — the change to fix. Entered via \`bp continue change <name> --command replan\`.

### Prerequisites
- Review phase found design/architecture BLOCKERs
- spec-review.md, quality-review.md, goal-review.md exist with findings

## Steps

${RESOLVE_PATHS}${READ_CONTEXT}${CHANGE_NAME_RESOLVE('reviewing', 'fix-plan')}

### Step 3: Read review findings

Read the three review files in the change directory:
- \`spec-review.md\` — spec coverage gaps, mismatches
- \`quality-review.md\` — bugs, security, conventions
- \`goal-review.md\` — unmet must_haves

Extract all BLOCKER and FLAG findings with their file:line references.

### Step 4: Dispatch planner sub-agent (fix mode)

**If LIGHTWEIGHT** — write fix documents yourself:
- Write \`review-design.md\` using \`bp template design\` — correct the architecture
- Write \`review-task.md\` using \`bp template tasks\` — fix tasks for each BLOCKER

**If FULL** — dispatch planner:

1. Run \`bp dispatch planner --change $1\`
2. Set the sub-agent prompt to **fix mode**:
   - Task: produce review-design.md + review-task.md from review findings
   - Read: spec-review.md, quality-review.md, goal-review.md
   - For each BLOCKER finding: describe what was wrong, why the new approach fixes it
   - Write review-design.md (title: "# Fix Design: [BP:CHANGE_NAME]")
   - Write review-task.md (title: "# Fix Tasks: [BP:CHANGE_NAME]")
     - Wave 1 = BLOCKER fixes, Wave 2 = FLAG fixes
     - Each task references the review finding it addresses
     - spec_ref points to review file + finding number
   - Output: review-design.md + review-task.md (NOT design.md/tasks.md)

### Step 5: Verify output

- review-design.md addresses all BLOCKER findings
- review-task.md has executable tasks for each finding
- No template placeholders remain

${COMMIT_ADVANCE('docs', 'fix plan for [BP:CHANGE_NAME]')}

## Guardrails
- Planner runs in FIX MODE — output is review-design.md + review-task.md, not design.md/tasks.md
- Fix plan must reference specific review findings — not generic descriptions
- Advance routes to fix-apply automatically`;

export function getFixPlanSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-fix-plan',
    description: 'Fix design — correct architecture/approach based on review BLOCKERs',
    instructions,
  };
}

export function getFixPlanCommandTemplate(): CommandTemplate {
  return {
    description: 'Fix design — correct architecture/approach based on review BLOCKERs',
    category: 'Workflow',
    tags: ['bp', 'fix-plan', 'design', 'review', 'loopback', 'sub-agent'],
    content: instructions,
  };
}
