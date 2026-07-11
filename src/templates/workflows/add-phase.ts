import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

### Parameters
- No parameters — all input is collected interactively

### Prerequisites
- \`bp/roadmap.md\` with defined milestones and phases
- \`bp/state.md\` with current milestone set
- Git repo (for \`git mv\` directory renames)

## Core Behavior

\`bp:add-phase\` inserts a new phase into the current milestone at a position you choose. It handles all the cascading changes: renumbering subsequent phases, renaming directories, updating roadmap.md and state.md.

**Key constraint:** phases are ordered by their numeric ID (\`ph.1\`, \`ph.2\`, …). Inserting a non-terminal phase means renumbering every phase after it, including renaming their directories on disk.

## Steps

### Step 1: Read current state
Run \`bp context\` and read \`bp/roadmap.md\`. Determine the current milestone and list all existing phases with their IDs and titles.

Read \`bp/state.md\` to find the current phase (if any).

### Step 2: Collect phase details from user
Use the \`ask\` tool to gather:

1. **Insertion point** — after which existing phase? List the phases in order and let the user pick. Options are every phase except shipped ones (if a milestone has shipped phases, the insertion point must be after the last shipped phase to avoid disrupting released work).

2. **Phase ID** — the directory ID, e.g. \`ph.2-frontend\`. Must follow the pattern \`ph.<number>-<kebab-case>\`. The number will be auto-assigned based on insertion position.

3. **Phase title** — human-readable title for the heading (e.g. \`Frontend UI\`).

4. **Goal, Deliverable, Inputs, Outputs** — same fields as roadmap phase sections.

5. **(Optional) Requirements** — does the user want to add new requirements to \`bp/requirements.md\` scoped to this phase?

### Step 3: Calculate renumbering
Let \`mid\` = milestone number (e.g. \`1\` for M1-core).
Let \`insertAfter\` = the chosen predecessor phase's numeric ID.
Let \`newId\` = \`insertAfter + 1\`.
Let \`affected\` = list of phases with numeric ID >= \`insertAfter + 1\`, in **descending** order.

Example: inserting after ph.1 in a milestone with ph.1, ph.2, ph.3, ph.4:
- newId = 2
- affected = [ph.4→5, ph.3→4, ph.2→3] (descending)

### Step 4: Update roadmap.md
Read \`bp/roadmap.md\` and perform changes:

1. **Insert new phase section** after the predecessor phase's section:
\`\`\`markdown
### Ph-{mid}.{newId}: {title} [NOT_STARTED]
- **Goal**: {goal}
- **Deliverable**: {deliverable}
- **Inputs**: {inputs}
- **Outputs**: {outputs}
\`\`\`

2. **Renumber subsequent phases** in all headings — change \`### Ph-{mid}.{oldId}\` to \`### Ph-{mid}.{newId}\` for every affected phase.

3. **Update dependency references** — if phase descriptions mention \`depends on: ph.{oldId}\`, update to the new number.

Use the \`edit\` tool for surgical changes. Do not rewrite the entire file.

### Step 5: Rename phase directories (back to front)
Process affected phases in **descending** numeric order (highest first) to avoid name collisions:

\`\`\`bash
git mv \\
  bp/milestones/{milestoneDir}/phases/ph.{oldId}-{name} \\
  bp/milestones/{milestoneDir}/phases/ph.{newId}-{name}
\`\`\`

For each rename, verify the source directory exists before moving.

**Important:** directory names use kebab-case phase names (e.g. \`ph.2-claude-code\`), NOT just the numeric ID. Read the directory listing to get the full current name before renaming.

### Step 6: Update state.md
Read \`bp/state.md\`:

- If \`current_phase\` matches an affected phase ID (before renumbering), update it to the new ID.
- If \`active_context.ref\` contains the phase directory path, update it to the renamed path.

### Step 7: Create new phase directory and initial files
\`\`\`bash
mkdir -p bp/milestones/{milestoneDir}/phases/ph.{newId}-{name}/changes/
\`\`\`

Create initial \`context.md\` from template:
\`\`\`bash
bp template context --stdout > bp/milestones/{milestoneDir}/phases/ph.{newId}-{name}/context.md
\`\`\`

Then edit the generated context.md to replace \`{{name}}\` and \`{{date}}\` with the new phase name and today's date.

### Step 8: Optionally update requirements.md
If the user wants to add requirements, read \`bp/requirements.md\` and use the \`edit\` tool to append new FR/NFR items. Each new requirement should mention \`Phase: {newPhaseTitle}\` in its description or annotation.

### Step 9: Commit
Make two commits for clarity:

1. **Phase renumbering** (roadmap + directory renames + state fix):
\`\`\`bash
bp commit "refactor(roadmap): renumber phases for {mid}.{newId} insertion" \\
  --files "bp/roadmap.md,bp/state.md" \\
  --scope roadmap
\`\`\`

2. **New phase creation** (directory + context.md):
\`\`\`bash
bp commit "feat(roadmap): add {phaseId} to milestone {milestoneDir}" \\
  --files "bp/milestones/{milestoneDir}/phases/{phaseId}/context.md" \\
  --scope roadmap
\`\`\`

### Step 10: Verify
Run \`ls -R bp/milestones/{milestoneDir}/phases/\` to verify directory structure.
Run \`cat bp/roadmap.md\` to verify section ordering.
Run \`bp state\` to verify current phase pointer is correct (if it was affected).

## Output
- Updated roadmap.md with the new phase inserted and subsequent phases renumbered
- Renamed phase directories via \`git mv\`
- New phase directory with initial context.md
- Updated state.md (if current phase was renumbered)
- Two git commits: renumbering + creation

## Guardrails
- **Reorder from back to front** — always rename the highest-numbered phase first to avoid temporary name collisions.
- **Never modify shipped phases** — if any phase in the milestone is \`[COMPLETED]\`, it cannot be renumbered. Only insert after the last shipped phase.
- **Phases are referenced by numeric ID** — both in roadmap headings and disk directories. Both must stay in sync.
- **One new phase per invocation** — do not insert multiple phases in a single run. Run \`bp:add-phase\` again for the next one.
- **Verify after every rename** — use \`read\` to confirm the directory exists at the new path before proceeding to the next.`;

export function getAddPhaseSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-add-phase',
    description: 'Add a new phase to the current milestone — insert, renumber, rename directories, update roadmap',
    instructions,
  };
}

export function getAddPhaseCommandTemplate(): CommandTemplate {
  return {
    description: 'Add phase — insert a new phase into the current milestone, renumber subsequent phases, rename directories, update roadmap.md and state.md',
    category: 'Planning',
    tags: ['bp', 'add-phase', 'milestone', 'roadmap', 'phase'],
    content: instructions,
  };
}
