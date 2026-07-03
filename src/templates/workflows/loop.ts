import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **None needed** — reads state and loops through all steps
- Optionally: \`<change-name>\` to loop on a specific change

### Prerequisites
- \`bp/state.md\` must exist
- Loop mode works for ALL steps — every decision is made by AI

## Core Rule

**AUTO MODE: NEVER ask the user. Make every decision yourself.**

- No \`ask\` tool calls. Period.
- Default to recommended options, prefer reasonable defaults over perfect precision
- Use best engineering judgment based on available context

## Steps

### Step 1: Read state and context
Run \`bp state\` — confirm project/phase/change status.
Run \`bp context <step>\` — read all listed artifacts for the current step.

### Step 2: Check if current step is complete
Read the current step's expected artifacts. Verify they exist and are not empty templates.

**If complete →** Go to Step 4.

**If not complete →** Continue to Step 3.

### Step 3: Execute the current step
Read the step instructions from \`read skill://bp-<step>\` or the slash command output. Execute WITHOUT asking:

**Interactive steps (grill, discuss):**
- Get the template first, read existing artifacts, fill with best judgment
- Never ask which mode, how many phases, which change — decide yourself

**Sub-agent steps (research, plan, apply, review):**
- Dispatch sub-agents with proper context
- Auto-classify change type (LIGHTWEIGHT vs FULL)
- For parallel tasks: analyze depends_on, group independently

**Orchestrator steps (roadmap, split, archive):**
- Auto-determine structure based on requirements and research
- Run CLI commands directly

### Step 4: Advance
Run \`bp continue\` (or \`bp continue change <name>\` for change context).
Check \`---END---\` marker and \`chars:\` value in output to confirm complete.

If the output provides next step instructions → go back to Step 1.
If output says "No available next step" → check for pending changes. If change-level work is pending, run \`bp continue change <name>\` instead.

### Step 5: Report progress
After each significant advance (milestone activated, phase shipped, change archived), log a brief summary:

\`\`\`
[bp-loop] Phase ph.1 shipped (4 changes). Advanced to ph.2-core-engine.
[bp-loop] Change toolchain-and-types archived. Next: vite-vitest-configs.
\`\`\`

## Stop conditions
- \`bp continue\` returns "No available next step" and no pending changes → all work complete
- A step fails and cannot be auto-resolved → report what's blocking
- Destructive action required (rm, force push, drop table) → pause and report
- All phases shipped, all milestones complete → project done

## Guardrails
- NEVER use the \`ask\` tool in loop mode
- Check \`---END---\` marker + \`chars:\` value on every \`bp continue\` call
- If truly stuck (contradictory specs, missing critical info), report blocker and stop
- Auto mode values speed and completeness — prefer reasonable defaults over perfect precision`;

export function getLoopSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-loop',
    description: 'Autonomous loop — auto-advance through all steps, AI fills all decisions without asking',
    instructions,
  };
}

export function getLoopCommandTemplate(): CommandTemplate {
  return {
    name: 'BP: Loop',
    description: 'Autonomous loop — auto-advance through all steps, AI fills all decisions without asking',
    category: 'Workflow',
    tags: ['bp', 'loop', 'auto', 'autonomous'],
    content: instructions,
  };
}
