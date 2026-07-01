import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\\\`<change-name>\\\`** (required) — the change to verify. Provided by \\\`bp continue\\\` output or user.
- If no change name, check the \\\`pending\\\` array from \\\`bp context verify\\\` JSON, filter by status \\\`reviewing\\\`, ask the user.

### Prerequisites
- Review phase complete: spec-review.md, quality-review.md, goal-review.md
- All review blockers resolved

## Steps

### Step 0: Classify change
Read \`tasks.md\` and check task types:
- **Lightweight**: ALL tasks are type: config | docs | refactor | scaffolding — no type:behavior
- **Full**: any type:behavior tasks

### Step 1: Resolve change name and get context
Run \`bp context verify\` — outputs JSON with state and file manifest. If a change name was provided, use it directly. If not, read the \`pending\` array, filter by status \`reviewing\`, ask the user.

### Step 2: Execute verification

**If LIGHTWEIGHT — verify directly (skip sub-agent):**
- Run \`npx vitest run\` — must pass
- Run \`npx tsc --noEmit\` — must pass
- Get template: \`bp template verification\`, fill with results
- Status: passed if both pass, otherwise gaps_found

**If FULL — dispatch verifier sub-agent:**
Run \`bp dispatch verifier --change <change-name>\` for platform-specific dispatch instructions.

Construct the sub-agent prompt:
- Task: verify the change delivers what it promised — goal-backward analysis + UAT
- Read: delta-specs, review reports (spec-review.md, quality-review.md, goal-review.md), implementation
- Output: verification.md with status (passed | gaps_found | human_needed), truth table, UAT results
- The sub-agent's system prompt (.omp/agents/bp-verifier.md) contains verification protocol.

### Step 3: Handle results
- \\\`passed\\\` → advance to archive
- \\\`gaps_found\\\` → route back to apply (reapply) or plan (replan)
- \\\`human_needed\\\` → surface to user with specific questions

### Step 4: Advance
Run \\\`bp continue\\\` to proceed to archive (if passed).

## Guardrails
- **You are the orchestrator** — dispatch for full changes, verify directly for lightweight
- Verification uses goal-backward analysis
- TDD commit integrity is a BLOCKER (full changes only)
- Test suite must pass completely`;

export function getVerifySkillTemplate(): SkillTemplate {
  return {
    name: 'bp-verify',
    description: 'Test verification — goal-backward analysis + UAT, dispatch verifier sub-agent',
    instructions,
  };
}

export function getVerifyCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Verify',
    description: 'Test verification — goal-backward analysis + UAT, dispatch verifier sub-agent',
    category: 'Workflow',
    tags: ['bp', 'verify', 'testing', 'uat', 'sub-agent'],
    content: instructions,
  };
}
