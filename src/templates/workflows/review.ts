import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to review. Provided by \`specwf continue\` output or user.
- If no change name is available, check the \`pending\` array from \`specwf context <step>\` JSON output, then ask the user.

### Prerequisites
- Apply phase complete: implementation code, tests, summary.md

## Steps

### Step 0: Classify change
Read \`tasks.md\` and check task types:
- **Lightweight**: ALL tasks are type: config | docs | refactor | scaffolding — no type:behavior
- **Full**: any type:behavior tasks

### Step 1: Resolve change name and get context
If a change name was provided: use it directly. If not: run \`specwf state\`, list pending changes with status \`applying\`, ask the user to pick. Then run \`specwf context review\` to get the file manifest. Read all listed files.

### Step 2: Execute review

**If LIGHTWEIGHT — quick checklist (skip sub-agents):**
- Check: \`npx tsc --noEmit\` passes
- Check: \`npx vitest run\` passes (if tests exist)
- Check: change-summary.md is filled (not template)
- If all pass → write all three review files with PASS verdict and \"Lightweight — no behavioral changes\" note
  - \`spec-review.md\`: \"No delta-specs — lightweight change\"
  - \`quality-review.md\`: quick scan for obvious issues, PASS if clean
  - \`goal-review.md\`: verify proposal must_haves are met

**If FULL — dispatch parallel review sub-agents:**
Run \`specwf dispatch reviewer --change <change-name>\` for platform-specific dispatch instructions. Dispatch three in parallel, each with a different role: spec-review, quality-review, goal-review.

Construct each sub-agent prompt:
- Task: review the change according to assigned role
- Read: proposal.md, delta-specs, design.md, implementation
- Output: spec-review.md | quality-review.md | goal-review.md to specwf/changes/<change-name>/
- The sub-agent's system prompt (.omp/agents/specwf-reviewer.md) contains per-role review checklists.

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
- **You are the orchestrator** — dispatch for full changes, quick-checklist for lightweight
- Full: All three reviews run in parallel — no inter-dependencies
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
