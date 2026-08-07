import { CLASSIFY_CHANGE, CONTEXT_JSONL_REMINDER } from './shared.js';
import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `${CONTEXT_JSONL_REMINDER}## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, use the most recently planned change.

## Prerequisites

- \`design.md\` exists and is not a template.
- \`tasks.md\` exists with at least 1 wave and unchecked checkboxes.
- Delta specs exist for each affected domain.

## Steps

## Orchestrator Steps

> These are the steps you (orchestrator) execute in order. \`bp apply\` only outputs these steps — it does not auto-execute. Implementation is done by executor sub-agents.

### Step 1: Resolve change name and paths

Same as plan workflow Step 1.

### Step 2: Classify change (lightweight vs full)

${CLASSIFY_CHANGE}

### Step 3: Wave analysis (Full mode)

Read \`tasks.md\` and build an execution plan:
1. Extract all \`## Wave N:\` sections, keeping wave order.
2. Build the inter-wave dependency graph from each task's \`depends_on\` field.
3. Check file-manifest overlap: waves that modify the SAME file cannot run concurrently — force them into the same wave or sequential rounds.
4. Waves with no unmet cross-wave dependencies can run concurrently; dependent waves wait for their predecessors.
5. For each wave, prepare an executor dispatch prompt: change name/directory, wave number + task IDs, and a summary of prior waves' key public interfaces.

**CRITICAL: Do NOT inject file contents into the dispatch prompt.** The executor reads tasks.md, design.md, specs/<domain>/spec.md, and bp/conventions/coding.md itself with the \`read\` tool. Paths save tokens and avoid biasing the executor with your interpretation.

### Step 4: Dispatch executor waves (Full mode)

Execute round by round. Each round: identify ready waves (no unmet dependencies), then dispatch ALL of them CONCURRENTLY (one task tool call per wave) with fresh, isolated bp-executor sub-agents. Wait for all waves in the round to complete.

After each wave, verify its output:
1. \`git log --oneline -5\` — new commits exist with correct hashes.
2. \`git diff --stat HEAD~N\` — files actually changed (not a no-op).
3. tasks.md tasks marked \`[x]\` with \`<!-- commit: HASH -->\`.
4. The wave's tests pass.
5. If a task lacks a commit annotation, re-run or re-dispatch it.

If any wave fails verification, re-dispatch it with specific feedback and do NOT proceed until the round passes.

After all rounds complete:
1. Run the project's build check and full test suite (per bp/config.yaml stack).
2. On failures: identify the responsible wave and re-dispatch with fix instructions.
3. On success: mark the \`## Pre-Archive Checklist\` items in tasks.md \`[x]\` (type-check/build, test suite, task hash annotations, acceptance criteria).

### Step 5: Lightweight mode (if classified as lightweight)

Implement the non-behavior tasks yourself, one by one — after each task run its tests and commit, marking \`[x]\` with the commit hash. After all tasks, run the full test suite and mark the Pre-Archive Checklist as in Step 4.

### Step 6: Commit and suggest next step

\`\`\`bash
# Update roadmap: If the change is linked to a roadmap phase, update it to \`- [-] $1 (implemented YYYY-MM-DD)\`.
git add bp/changes/$1/
bp commit "feat: implementation complete for $1" --files bp/changes/$1/
\`\`\`
  Next: bp check $1
  (or: bp continue $1)

Output:
\`\`\`
Implementation complete for $1
  - N tasks implemented in N wave(s)
  - N commits created
  - All tests pass

  Next: bp check $1
  (or: bp continue $1)
\`\`\`

## Output

- Tasks implemented, committed atomically, and marked \`[x]\` with commit hashes in tasks.md.
- Full build + test suite green and the Pre-Archive Checklist marked.

## Guardrails

- Full mode: MUST dispatch executor sub-agents per wave. Do NOT implement behavior tasks yourself.
- Concurrent waves in the same round: dispatch ALL in one task tool call (parallel).
- After each wave: verify git log, tasks.md marking, and test pass. No-op or incomplete = failure.
- NEVER skip review — apply's green tests are NOT a replacement for review.
- Do NOT run \`bp check\` automatically — let the user decide.
- Wave retry limit: max 2 re-dispatches per wave (global cap \`config.budget.max_subagent_runs\`, default 5) — beyond that, STOP and report as a blocker.
- Budget awareness: track dispatch count against \`config.budget.max_subagent_runs\` and wall time against \`config.budget.max_wall_time_min\` (default 60); warn if token usage approaches \`config.budget.estimated_token_cap\` (default 500000). These are advisory — stop and report if exceeded.
- Level-aware execution: Trivial = inline (no sub-agent); Light = single agent, TDD optional; Standard = waves + TDD; Critical = waves + TDD + security audit checkpoint.
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
