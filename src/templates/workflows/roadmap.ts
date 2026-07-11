import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the current project

### Prerequisites
- \`bp/requirements.md\` — complete requirements
- \`bp/research/\` — technical research results (if available)

## Steps

### Step 1: Get context
Run \`bp context roadmap\` — outputs state, requirements.md, and research/ paths. Read all listed files.

### Step 2: Detect roadmap state
Read \`bp/roadmap.md\`. Check if it already has defined milestones.

**First time (no milestones defined):**
Continue to Step 3.

**Adding a new milestone (roadmap already exists):**
- Mark all existing milestones as completed in the roadmap. Change \`[ACTIVE]\` → \`[COMPLETED]\`:
  \`\`\`diff
  - ## Md-1: Core Features [ACTIVE]
  + ## Md-1: Core Features [COMPLETED]
  \`\`\`
- Append new milestone(s) BELOW the existing milestones, keeping them separated by \`---\`
- Keep planning mode consistent — if M1 was technical-layer, M2 should be too
- Phase count for new milestone: determine by requirements scope
- Create directories for the new milestone ONLY:
  \`\`\`bash
  mkdir -p bp/milestones/$1/phases/[BP:PHASE_ID]
  \`\`\`

### Step 3: Choose planning mode (first time only)
Ask the user which planning mode shapes **phases within each milestone**:

- **MVP mode** (product-facing): each phase delivers user-facing value — ph.1 thinnest end-to-end → ph.2 expand → ph.3 polish
- **Technical-layer mode** (infrastructure/CLI): each phase produces a runnable/testable artifact — ph.1 data+core logic → ph.2 API+integration → ph.3 hardening

Use the \`ask\` tool. Record the choice at the top of roadmap.md: \`> Planning mode: <mvp || technical-layer>\`

### Step 4: Define Milestones
Get the roadmap template: \`bp template roadmap\`. Fill with milestones and phases per the mode chosen above.

**Default: 1 milestone = the entire project.** Milestones are product releases, NOT development phases. Only add M2+ when the user explicitly wants iterative releases (v1.0 → v2.0) and each milestone independently delivers value.

### Step 5: Create milestone directory and first phase directory only

List all milestone-phase pairs defined in your roadmap, then create ONLY the first phase directory.
The remaining directories are created on-demand when the agent advances to each phase.

\`\`\`bash
# Example: M1-core with ph.1-engine, ph.2-api, ph.3-plugins
mkdir -p bp/milestones/M1-core/phases/ph.1-engine
# ph.2-api and ph.3-plugins are NOT created yet — they will be created
# on-demand when the agent reaches each phase.
\`\`\`

At least one phase directory must exist for the state machine to advance.
Verify with: \`ls bp/milestones/\` — milestone root must exist.

### Step 6: Validate coverage
- All requirements.md scope covered by milestones and phases
- Phase dependencies form a DAG (no cycles)
- Each phase has a concrete, verifiable deliverable (not "design complete" — must be executable)
- Phase count per milestone: small 1-2, medium 2-3, large 3-4
- First phase is always the thinnest possible end-to-end path

### Step 7: Commit
\`\`\`bash
bp commit "docs(roadmap): define milestones and phases" --files "bp/roadmap.md" --scope roadmap --record
\`\`\`

### Step 8: Advance
**First milestone:**
\`\`\`bash
bp state set-milestone $1
bp state set-phase [BP:PHASE_ID]
\`\`\`

**New milestone (M1 already archived):**
\`\`\`bash
bp state set-milestone $1
\`\`\`
Do NOT set a phase — the new milestone needs grill → research → split first.

\`\`\`bash
bp continue
\`\`\`

## Output
- \`bp/roadmap.md\` — structured roadmap with milestone and phase tables
- \`bp/milestones/[BP:MILESTONE_ID]/\` — per-milestone directories

## Guardrails
- **Default: 1 milestone.** No "foundation", "setup", "scaffolding" — M1 = shippable product.
- **Create milestone root + first phase directory in roadmap step. Remaining phase directories are created on-demand** when advancing to each phase.
- Mode (MVP/technical-layer) shapes **phases within a milestone**, not the milestones themselves.
- First phase = thinnest end-to-end path (always phase 1, never phase 0).
- **Adding new milestone**: mark old ones as [COMPLETED], append new ones below, don't overwrite.
- **New milestone**: do NOT set-phase — grill/research/split will be done first.
- **Naming rules**: milestone directory IDs MUST use \`M<number>-<kebab-case>\` (e.g. \`M1-core\`). Phase directory IDs MUST use \`ph.<number>-<kebab-case>\` (e.g. \`ph.1-core\`). Roadmap headings use \`Md-{id}\` and \`Ph-{mid}.{pid}\` with integer IDs extracted from directory names.`;
export function getRoadmapSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-roadmap',
    description: 'Roadmap definition — split project into Milestones x Phases with structured format',
    instructions,
  };
}

export function getRoadmapCommandTemplate(): CommandTemplate {
  return {
    description: 'Roadmap definition — split project into Milestones x Phases with structured format',
    category: 'Planning',
    tags: ['bp', 'roadmap', 'planning', 'milestones'],
    content: instructions,
  };
}
