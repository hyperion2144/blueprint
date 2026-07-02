import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

### Parameters
- **None needed** — reads state and auto-advances through all steps
- Optionally: \`<change-name>\` to advance a specific change

### Prerequisites
- \`bp/state.md\` must exist
- Auto mode works for ALL steps: grill, discuss, plan, split — every decision is made by AI

## Core Rule

**AUTO MODE: NEVER ask the user. Make every decision yourself.**

- No \`ask\` tool calls. Period.
- For grill: read requirements.md template, fill ALL sections with your best judgment based on the project context
- For discuss: read context.md template, fill locked decisions and gray areas yourself
- For plan: auto-classify change type (LIGHTWEIGHT vs FULL), dispatch planner if needed
- For split: auto-determine dependency graph and change granularity
- For roadmap: auto-choose planning mode, define milestones and phases
- For research: auto-dispatch researcher sub-agents

## Steps

### Step 1: Run bp continue --auto
Run \`bp continue --auto\`. The CLI:
1. Reads current state
2. Validates exit conditions
3. Advances to the next step
4. Outputs inline instructions for that step

The JSON output includes \`auto: true\` — this confirms you're in autonomous mode.

### Step 2: Execute the step autonomously
Read the step instructions from the CLI output. Execute them WITHOUT asking the user.

**For interactive steps (grill, discuss):**
- Get the template first: \`bp template requirements\` or \`bp template context\`
- Read existing artifacts (project.yml, roadmap.md, research/)
- Fill the template with your best engineering judgment
- Write the file and continue

**For planning steps (roadmap, split, plan):**
- Auto-determine the right structure based on requirements and research
- Dispatch sub-agents when the instructions say to
- Never ask "which mode?", "how many phases?", "which change first?" — decide yourself

**For change execution (plan, apply, review, verify, archive):**
- Run \`bp continue change <name> --auto\` for each pending change
- Execute the step as instructed
- Advance until the change is archived

### Step 3: Loop until blocked or complete
After each step completes, run \`bp continue --auto\` again to get the next step.

**Stop conditions:**
- \`bp continue --auto\` returns \`"No available next step"\` → all work complete
- A step fails and cannot be auto-resolved → report what's blocking
- All phases shipped, all milestones complete → project done

### Step 4: Report progress
After each significant advance (milestone activated, phase shipped, change archived), log a brief summary:

\`\`\`
[bp-auto] Phase ph.1 shipped (4 changes). Advanced to ph.2-core-engine.
[bp-auto] Change toolchain-and-types archived. Next: vite-vitest-configs.
\`\`\`

## Output
- All BP workflow steps executed end-to-end without user intervention
- State updated through the full lifecycle
- Any blockers reported with specific next actions

## Guardrails
- NEVER use the \`ask\` tool in auto mode
- NEVER pause for confirmation unless a change would be destructive (rm, force push, drop table)
- If truly stuck (contradictory specs, missing critical info), report the blocker clearly and stop
- Every decision uses best engineering judgment based on available context
- Auto mode values speed and completeness — prefer reasonable defaults over perfect precision`;

export function getAutoSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-auto',
    description: 'Fully autonomous mode — auto-advance all steps, AI fills all decisions without asking',
    instructions,
  };
}

export function getAutoCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Auto',
    description: 'Fully autonomous mode — auto-advance all steps, AI fills all decisions without asking',
    category: 'Workflow',
    tags: ['bp', 'auto', 'autonomous', 'continue', 'hands-free'],
    content: instructions,
  };
}
