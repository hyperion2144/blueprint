import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, use the most recently planned change.
- **\`--fix\`** (optional): fix mode — executors read review.md issues and fix them.

## Prerequisites

- \`design.md\` exists and is not a template
- \`tasks.md\` exists, has at least 1 wave, checkboxes are unchecked (normal mode)
- Delta specs exist for each affected domain
- In --fix mode: \`review.md\` exists with unresolved R/Q/G issues

## Steps

### Step 1: Resolve change name and paths

Same as plan workflow Step 1.

### Step 2: Classify change (lightweight vs full)

Read \`tasks.md\` task types:
- **Lightweight**: ALL tasks are type:config|docs|refactor|scaffolding (no type:behavior)
- **Full**: any type:behavior task

### Step 3: Wave analysis (Full mode)

Read \`tasks.md\` and parse into execution plan:

1. **Extract waves**: Read all \`## Wave N: <theme>\` sections. Keep wave order.

2. **Build inter-wave dependency graph**:
   - For each task, extract \`depends_on\` field
   - If task in Wave B has \`depends_on\` referencing a task in Wave A -> Wave B depends on Wave A
   - Result: DAG where nodes = waves, edges = cross-wave depends_on

3. **Generate execution plan**:
   - Waves with NO unmet cross-wave dependencies -> can run concurrently
   - Waves WITH cross-wave dependencies -> must wait for predecessor wave(s)

4. **For each wave, prepare executor context**:
   - Change name and path
   - ALL tasks in this wave (ids, types, descriptions, files, acceptance, RED tests)
   - ALL referenced specs (from \`spec_ref\` fields across tasks)
   - Design context (relevant DS-N items)
   - Conventions file path
   - In --fix mode: review.md issue list for this wave

### Step 4: Dispatch executor waves (Full mode)

**Execute round by round:**

Each round:
1. Identify waves with no unmet dependencies -> ready to run
2. Dispatch ALL ready waves CONCURRENTLY (one task tool call per wave, all in one batch)
   - Each wave gets its own executor sub-agent
   - Fresh context: yes
   - Isolated: yes (executors modify source files and make git commits concurrently)
3. Wait for ALL waves in this round to complete

**After each round, verify each wave's output:**

For each completed wave:
1. **Check git log**: \`git log --oneline -5\` - confirm new commits exist with correct hashes
2. **Check git diff**: \`git diff --stat HEAD~N\` - confirm files actually changed (not no-op)
3. **Check tasks.md**: confirm tasks marked [x] with \`<!-- commit: HASH -->\` annotation
4. **Run wave's tests**: \`npx vitest run <test-files>\` - confirm tests pass
5. **If any task missing commit annotation**: re-run that task manually or re-dispatch

**If any wave fails verification:**
- Re-dispatch the failed wave with specific feedback
- Do NOT proceed to next round until all waves in current round pass

**After all rounds complete:**
1. Run full test suite: \`tsc --noEmit && vitest run\`
2. If failures: identify which wave caused them, re-dispatch with fix instructions
3. If all pass: proceed to Step 5

### Step 5: Lightweight mode (if classified as lightweight)

If all tasks are non-behavior:
1. Implement tasks yourself, one by one
2. After each task: run relevant tests, commit with \`bp commit\` or direct git
3. Mark [x] with commit hash in tasks.md
4. After all tasks: run full test suite

### Step 6: Commit and suggest next step

\`\`\`bash
git add bp/changes/$1/ && bp roadmap-update $1
bp commit "feat: implementation complete for $1" --files bp/changes/$1/
\`\`\`

Output:
\`\`\`
Implementation complete for $1
  - N tasks implemented in N wave(s)
  - N commits created
  - All tests pass

  Next: bp review $1
  (or: bp continue $1)
\`\`\`

## Guardrails

- **Full mode: MUST dispatch sub-agents per wave.** Do NOT implement behavior tasks yourself.
- **Concurrent waves in the same round: dispatch ALL in one task tool call (parallel).**
- **After each wave: verify git log, tasks.md marking, test pass.** No-op or incomplete = failure.
- **NEVER skip review.** Apply's test pass is NOT a replacement for review.
- In --fix mode: executors read review.md, fix R/Q/G issues. Do NOT fix D issues (those need replan).
- Do NOT run bp review automatically - let the user decide.
`;

export function getApplySkillTemplate(): SkillTemplate {
  return {
    name: 'bp-apply',
    description: 'Code implementation — wave-based dispatch of executor sub-agents',
    instructions,
  };
}

export function getApplyCommandTemplate(): CommandTemplate {
  return {
    description: 'Code implementation — wave-based dispatch of executor sub-agents',
    category: 'Workflow',
    tags: ['bp', 'apply', 'implementation', 'tdd', 'sub-agent', 'waves'],
    content: instructions,
  };
}
