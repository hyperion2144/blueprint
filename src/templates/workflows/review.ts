import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to review. Provided by \`specwf continue\` output or user.
- If no change name is available, check the \`pending\` array from \`specwf context <step>\` JSON output, then ask the user.

### Prerequisites
- Apply phase complete: implementation code, tests, summary.md

## Steps

### Step 1: Resolve change name and get context
If a change name was provided: use it directly. If not: run \`specwf state\`, list pending changes with status \`applying\`, ask the user to pick. Then run \`specwf context review\` to get the file manifest. Read all listed files.

### Step 2: Dispatch parallel review sub-agents
**You are the orchestrator — dispatch, do not review yourself.** Spawn three \`specwf-reviewer\` sub-agents in parallel, each with a different role:

\`\`\`text
Sub-agent: specwf-reviewer
Change: <change-name>
Role: spec-review | quality-review | goal-review (pick one per agent)

Task: Review the change according to your assigned role.
Read proposal.md, delta-specs, design.md, and the implementation.
Cite specific file:line references for every finding.

Output: write spec-review.md | quality-review.md | goal-review.md to specwf/changes/<change-name>/
\`\`\`

### Step 3: Aggregate results
After all three complete, check each report:
- \`spec-review.md\`: all SHALL/MUST covered? BLOCKERs?
- \`quality-review.md\`: any BLOCKERs or MAJOR issues?
- \`goal-review.md\`: all goals ACHIEVED?

### Step 4: Handle findings
- Auto-fixable issues → fix and re-verify
- Architecture-level issues → pause and ask user
- No BLOCKERs → advance

### Step 5: Advance
Run \`specwf continue\` to proceed to verify.

## Guardrails
- **You are the orchestrator** — dispatch reviewers, do not review yourself
- All three reviews run in parallel — no inter-dependencies
- Gate behavior depends on project.yml \`review.gate\` setting
- Findings classified: BLOCKER (must fix), FLAG (should fix), NOTE (informational)`;

export function getReviewSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-review',
    description: 'Triple review — dispatch reviewer sub-agents in parallel',
    instructions,
  };
}

export function getReviewCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Review',
    description: 'Triple review — dispatch reviewer sub-agents in parallel',
    category: 'Workflow',
    tags: ['specwf', 'review', 'quality', 'specs', 'sub-agent'],
    content: instructions,
  };
}
