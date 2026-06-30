import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **\`<change-name>\`** (required) — the change to verify. Provided by \`specwf continue\` output or user.
- If no change name, check the \`pending\` array from \`specwf context verify\` JSON, filter by status \`reviewing\`, ask the user.

### Prerequisites
- Review phase complete: spec-review.md, quality-review.md, goal-review.md
- All review blockers resolved

## Steps

### Step 1: Resolve change name and get context
Run \`specwf context verify\` — outputs JSON with state and file manifest. If a change name was provided, use it directly. If not, read the \`pending\` array, filter by status \`reviewing\`, ask the user.

### Step 2: Dispatch verifier sub-agent
**You are the orchestrator — dispatch, do not verify yourself.** Spawn \`specwf-verifier\` with:

\`\`\`text
Sub-agent: specwf-verifier
Change: <change-name> (from specwf/changes/<change-name>/)

## Goal-Backward Verification

Start from what the change SHOULD deliver, then verify it actually exists and works. Do NOT trust summary.md claims — they document what was SAID, not what EXISTS.

## Step 1: Establish truths
Read proposal.md must-haves and delta-specs. For each must-have, ask:
1. What must be TRUE for this to be achieved?
2. What must EXIST in the codebase for those truths?
3. What must be WIRED for those artifacts to function?

## Step 2: Run automated checks
- Full test suite (diagnose any failures to root cause)
- Type check (tsc --noEmit or equivalent)
- Lint check
- Each delta-spec SHALL/MUST must have passing test coverage

## Step 3: Adversarial stance
Assume each must-have is NOT achieved until codebase evidence proves it. Classify:
- **VERIFIED**: code evidence confirms the must-have is delivered
- **FAILED (BLOCKER)**: must-have not achieved; change must not proceed
- **UNCERTAIN (WARNING)**: insufficient evidence; human decision required

## Step 4: UAT — User Acceptance Testing
For each must-have that describes user-observable behavior:
- If a UI exists: open it, verify the behavior matches the spec
- If an API exists: call it, verify the response matches the spec
- If a CLI command exists: run it, verify the output matches the spec
- Record what was tested and the result

## Step 5: Output VERIFICATION.md
Write to specwf/changes/<change-name>/verification.md:
- Status: passed | gaps_found | human_needed
- Truth table: each must-have → VERIFIED / FAILED / UNCERTAIN with evidence
- UAT results: what was tested manually, what passed
- BLOCKERs: list of must-haves that failed (blocks advancement)
- WARNINGs: items needing human review

## Routing
- passed → archive
- gaps_found → BLOCKERs listed → route back to apply (reapply)
- human_needed → surface to user with specific questions
\`\`\`

### Step 3: Handle results
- \`passed\` → advance to archive
- \`gaps_found\` → route back to apply (reapply) or plan (replan)
- \`human_needed\` → surface to user with specific blocking questions

### Step 4: Advance
Run \`specwf continue\` to proceed to archive (if passed).

## Output
- \`verification.md\` — verification report with truth table, UAT results, BLOCKERs/WARNINGs

## Guardrails
- **You are the orchestrator** — dispatch verifier, do not verify yourself
- Goal-backward: what should be delivered → is it actually there?
- Adversarial stance: assume NOT achieved until evidence proves it
- BLOCKERs block advancement — do not advance with unresolved BLOCKERs`;

export function getVerifySkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-verify',
    description: 'Test verification — goal-backward analysis + UAT, dispatch verifier sub-agent',
    instructions,
  };
}

export function getVerifyCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Verify',
    description: 'Test verification — goal-backward analysis + UAT, dispatch verifier sub-agent',
    category: 'Workflow',
    tags: ['specwf', 'verify', 'testing', 'uat', 'sub-agent'],
    content: instructions,
  };
}
