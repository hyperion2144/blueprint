import { CONTEXT_JSONL_REMINDER } from './shared.js';
import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `${CONTEXT_JSONL_REMINDER}## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, use most recently proposed change.
- **\`--fix\`** (optional): fix mode — planner reads review.md D-issues and redesigns.

## Prerequisites

- \`proposal.md\` exists in change directory and is not a template

## Steps

### Step 1: Read codebase context

Read bp/.codebase-map.md if it exists for module structure overview. Only read specific source files when you need implementation details.
Before reading the map, check if it's stale: run \`bp map refresh --check\`. If stale (git_hash mismatch), run \`bp map refresh\` to regenerate. A stale map may have incorrect module structure.

### Step 2: Resolve change name and paths

If \`$ARGUMENTS\` is empty:
- List \`bp/changes/\` for active changes (not in \`archive/\`)
- If multiple exist, ask the user which one
- If none exist, suggest \`bp propose <name>\`

Change directory: \`bp/changes/$1/\`


### Step 3: Impact analysis (v2.1 7.2.1)

Before designing, analyze what this change impacts:
1. Read proposal.md deliverables — identify files/modules to be modified
2. For each modified file, find its callers/dependents:
   - Use grep to find imports/references to the modified modules
   - Or use LSP references if available
3. Write an ## Impact Analysis section in design.md listing:
   - Direct impacts: files being modified
   - Indirect impacts: callers/dependents that may need updates
   - Test impacts: existing tests that may break

### Step 4: Classify change (lightweight vs full)

Read \`proposal.md\` deliverables:
- **Lightweight**: All deliverables are config/docs/refactor/scaffolding (no new behavior)
- **Full**: Any deliverable introduces new behavior

### Step 5: Dispatch planner (Full mode)

**If FULL: dispatch planner sub-agent. Do NOT write design/tasks/specs yourself.**

1. Prepare planner context:
   - Change name and directory path
   - List files to read: proposal.md, bp/specs/<domain>/spec.md (per affected domain), bp/conventions/coding.md, bp/config.yaml
   - Instruction: "Read planner agent prompt, produce design.md, tasks.md, and specs/<domain>/spec.md (delta specs under the change directory, NOT bp/specs/)"
   - In --fix mode: also include review.md, focus on D-prefixed issues

2. Dispatch via task tool. Wait for planner to complete.

3. Verify planner output (see Step 6).

**If LIGHTWEIGHT:**
1. Fill design.md template directly
2. Fill tasks.md with 1 wave
3. No delta specs needed (no behavioral changes)

### Step 6: Verify output

**Traceability:**
- Every PR-N in proposal.md referenced by at least one DS-N in design.md
- Every DS-N in design.md referenced by at least one T-N in tasks.md
- Every type:behavior task has \`spec_ref\` pointing to delta spec

**Completeness:**
- design.md has: Design Items, Impact Analysis, Architecture Decisions, Technical Approach, File Manifest
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

### Step 7: Task granularity check (v2.1 P0)

After planner produces tasks.md, check granularity and warn if too large:

- tasks total > 20 → warn: 'Change may be too large. Consider splitting into multiple changes.'
- files in File Manifest > 15 → warn: 'File manifest exceeds 15 files. Consider splitting.'
- wave count > 5 → warn: 'Excessive wave decomposition. Consolidate independent tasks.'
- single wave task count > 8 → warn: 'Wave too large. Split into multiple waves.'

This is advisory, not blocking — the user decides whether to proceed or split.
If any threshold exceeded, output the warnings before suggesting next step.

### Step 8: Commit and suggest next step

\`\`\`bash
# Update roadmap: If the change's proposal.md has \`## Roadmap Reference\`, read \`bp/roadmap.md\`, find the change in that phase's Changes list, and update it to \`- [-] $1 (planned YYYY-MM-DD)\`.
git add bp/changes/$1/
bp commit "docs(plan): design + tasks + delta specs for $1" --files bp/changes/$1/
# In --fix mode, also run: bp plan --write-context $1
\`\`\`

# Record execution metadata (v2.1 P5)
# Orchestrator should write .meta/planner-run-N.json after planner completes
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
