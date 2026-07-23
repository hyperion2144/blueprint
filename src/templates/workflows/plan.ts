import { CONTEXT_JSONL_REMINDER } from './shared.js';
import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `${CONTEXT_JSONL_REMINDER}## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, use most recently proposed change.
- **\`--fix\`** (optional): fix mode — planner reads review.md D-issues and redesigns.

## Prerequisites

- \`proposal.md\` exists in change directory and is not a template

## Orchestrator Steps

> These are the steps you (orchestrator) execute in order. \`bp plan\` only outputs these steps — it does not auto-execute. Codebase queries and impact analysis are done by the planner sub-agent.

### Step 1: Resolve change name and paths

If \`$ARGUMENTS\` is empty:
- List \`bp/changes/\` for active changes (not in \`archive/\`)
- If multiple exist, ask the user which one
- If none exist, suggest \`bp propose <name>\`

Change directory: \`bp/changes/$1/\`

### Step 2: Classify change (lightweight vs full)

Read \`proposal.md\` deliverables:
- **Lightweight**: All deliverables are config/docs/refactor/scaffolding (no new behavior)
- **Full**: Any deliverable introduces new behavior

### Step 3: Dispatch planner (Full mode)

**If FULL: dispatch planner sub-agent. Do NOT write design/tasks/specs yourself.**

1. Prepare planner context:
   - Change name and directory path
   - List files to read: proposal.md, bp/specs/<domain>/spec.md (per affected domain), bp/conventions/coding.md, bp/config.yaml
   - Instruction: "Read planner agent prompt, produce design.md, tasks.md, and specs/<domain>/spec.md (delta specs under the change directory, NOT bp/specs/)"
   - In --fix mode: also include review.md, focus on D-prefixed issues

2. Dispatch via task tool:
   - Agent type: bp-planner
   - Fresh context: yes
   - Isolated: no (planner is read-only on source code, writes only to change directory)

   The planner sub-agent will:
   - Query the codebase map (\`bp map list\`, \`bp map module <name>\`, \`bp map impact <module>\`) for module structure and dependencies
   - Perform impact analysis and write \`## Impact Analysis\` section in design.md
   - Produce design.md, tasks.md, and delta specs

3. Wait for planner to complete.

**If LIGHTWEIGHT:**
1. Fill design.md template directly
2. Fill tasks.md with 1 wave
3. No delta specs needed (no behavioral changes)

### Step 4: Review planner output

Before committing, review the planner's design for soundness:

1. Read \`design.md\` — are DS-N components well-decomposed? Is the architecture sound?
2. Read \`tasks.md\` — are tasks properly split? Are TDD types correct? Are waves well-organized?
3. Read \`specs/<domain>/spec.md\` — are requirements well-written? Do scenarios cover edge cases?
4. Check \`## Impact Analysis\` section in design.md — did the planner identify all affected modules?

**If problems found: re-dispatch planner with specific feedback on what to fix. After re-dispatch, return to Step 4 to review the updated output. Repeat this review loop until the design is sound.** Do NOT proceed with a flawed design — it will cascade into implementation failures.

### Step 5: Verify output

**Traceability:**
- Every PR-N in proposal.md referenced by at least one DS-N in design.md
- Every DS-N in design.md referenced by at least one T-N in tasks.md
- Every type:behavior task has \`spec_ref\` pointing to delta spec

**Completeness:**
- design.md has: Design Items, Architecture Decisions, Technical Approach, File Manifest, Impact Analysis
- tasks.md has: TDD Type Annotations, at least 1 Wave, Pre-Archive Checklist
- Delta specs exist for affected domain (specs/<domain>/spec.md)
- Delta specs use correct sections (ADDED/MODIFIED/REMOVED)
- File manifest lists every file (no "etc.")

**Quality:**
- No template placeholders remaining in any file
- DS-N components have clear single responsibility
- D-N decisions have real alternatives
- type:behavior tasks have RED descriptions (GIVEN/WHEN/THEN)
- Requirements use SHALL/MUST/SHOULD correctly
- Each requirement has at least 1 scenario

If any check fails: re-dispatch planner with specific feedback on what's missing.

### Step 6: Task granularity check

After planner produces tasks.md, check granularity and warn if too large:

- tasks total > 20 → warn: 'Change may be too large. Consider splitting into multiple changes.'
- files in File Manifest > 15 → warn: 'File manifest exceeds 15 files. Consider splitting.'
- wave count > 5 → warn: 'Excessive wave decomposition. Consolidate independent tasks.'
- single wave task count > 8 → warn: 'Wave too large. Split into multiple waves.'

### Step 7: Commit and suggest next step

\`\`\`bash
# Update roadmap: If the change's proposal.md has \`## Roadmap Reference\`, read \`bp/roadmap.md\`, find the change in that phase's Changes list, and update it to \`- [-] $1 (planned YYYY-MM-DD)\`.
git add bp/changes/$1/
bp commit "docs(plan): design + tasks + delta specs for $1" --files bp/changes/$1/
\`\`\`
  Next: bp apply $1
  (or: bp continue $1)

Output:
\`\`\`
Planner completed for $1
  - design.md: N design items, N decisions
  - tasks.md: N tasks in N wave(s)
  - specs/: N delta spec(s)

  Next: bp apply $1
  (or: bp continue $1)
\`\`\`

## Guardrails

- **Context is auto-injected by the OMP Extension.** Do NOT call \`bp context plan\`; the extension already supplies the same material at every turn.
- **Full mode: MUST dispatch sub-agent.** Do NOT write design/tasks/specs yourself.
- Lightweight mode: write templates directly (no sub-agent needed)
- tasks.md boxes must remain UNCHECKED
- In --fix mode: planner only redesigns — does NOT modify tasks.md or specs
- **Review planner output before committing.** If design is flawed, re-dispatch planner — do not proceed with broken design.
- **Task granularity is advisory, not blocking.** Warn on tasks>20/files>15/waves>5/per-wave>8, but let the user decide whether to proceed or split.
- **Level-aware dispatch**: Trivial/Light changes may skip planner sub-agent (orchestrator fills templates directly). Standard/Critical MUST dispatch planner. Critical adds security dimension to design.
`;

export function getPlanSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-plan',
    description: 'Change design — dispatch planner sub-agent for design + tasks + delta-specs',
    instructions,
  };
}

export function getPlanCommandTemplate(): CommandTemplate {
  return {
    description: 'Change design — dispatch planner sub-agent for design + tasks + delta-specs',
    category: 'Planning',
    tags: ['bp', 'plan', 'design', 'tasks', 'specs', 'sub-agent'],
    content: instructions,
  };
}
