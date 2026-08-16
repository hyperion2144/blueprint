import { CONTEXT_JSONL_REMINDER } from './shared.js';
import { ORCHESTRATOR_RULE } from '../types.js';
import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = ORCHESTRATOR_RULE + `${CONTEXT_JSONL_REMINDER}## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, use the most recently proposed change.

## Prerequisites

- \`proposal.md\` exists in the change directory and is not a template.

## Steps

## Orchestrator Steps

> These are the steps you (orchestrator) execute in order. \`bp plan\` only outputs these steps — it does not auto-execute. Codebase queries and impact analysis are done by the planner sub-agent.

### Step 1: Resolve change name and paths

If \`$ARGUMENTS\` is empty: list \`bp/changes/\` (exclude \`archive/\`) for active changes; if multiple exist, ask the user which one; if none exist, suggest \`bp propose <name>\`. Change directory: \`bp/changes/$1/\`.

### Step 2: Classify change (lightweight vs full)

- **Lightweight**: all proposal deliverables are config/docs/refactor/scaffolding (no new behavior).
- **Full**: any deliverable introduces new behavior.
- **UI-scoped advisory**: if any deliverable touches UI surfaces (components, pages, styling), consider running \`bp plan-design-review $1\` during the design phase — it produces a DESIGN.md design-language reference plus a 0-10 UI plan rating. Advisory only; it does not gate planning.

### Step 3: Dispatch planner (Full mode)

**If FULL: dispatch the planner sub-agent. Do NOT write design/tasks/specs yourself.** Prepare its context (change name/directory, files to read: proposal.md, global specs, coding conventions, config.yaml; instruction: "Read planner agent prompt, produce design.md, tasks.md, and specs/<domain>/spec.md delta specs under the change directory"). Dispatch a fresh, non-isolated bp-planner (it is read-only on source and writes only to the change directory). The planner queries the codebase map (\`bp map list\`, \`bp map module <name>\`, \`bp map impact <module>\`) and writes the \`## Impact Analysis\` section. Wait for completion.

**If LIGHTWEIGHT:** fetch \`bp template design --stdout\` and \`bp template tasks --stdout\`, fill design.md and tasks.md (1 wave) directly. If any deliverable has behavioral changes, write delta specs per affected domain (fetch \`bp template spec --stdout\` for the format); otherwise skip delta specs.

### Step 4: Review planner output for design quality

Before committing, review the design against FIVE content-quality dimensions (substance, not format — Step 5 handles format). If ANY dimension fails, re-dispatch the planner with structured feedback (dimension + specific problem + expected state) and re-review.

#### Dimension 1: Implementability

The executor must be able to implement from the design alone — no guessing, no ambiguous decisions left open.

#### Dimension 2: Verifiable acceptance

Every acceptance criterion must be something that can actually be checked against the implemented result.

#### Dimension 3: Detailed design depth

The Detailed Design sections must carry real implementation depth — the specifics that make the design executable, not restatements of the key interfaces.

#### Dimension 4: Failure coverage

The design must cover error paths, boundary conditions, and failure modes — not just the happy path.

#### Dimension 5: Proposal alignment

The design must match the proposal's requirements — fully covered, nothing deviated or dropped.

#### If problems found

Re-dispatch the planner with per-finding feedback (Dimension, DS-N/file, Problem, Expected), then return to Step 4. Repeat until the design passes all five dimensions — do NOT proceed with a flawed design.

### Step 5: Verify output

**Traceability:** every PR-N referenced by a DS-N; every DS-N referenced by a T-N; every type:behavior task has a \`spec_ref\` to a delta spec.

**Completeness:** design.md has Design Items, Architecture Decisions, Technical Approach, File Manifest, Impact Analysis; tasks.md has TDD Type Annotations, at least 1 Wave, Pre-Archive Checklist; delta specs exist with ADDED/MODIFIED/REMOVED sections; the file manifest lists every file (no "etc.").

**Structural Completeness (format):** no template placeholders; type:behavior tasks have RED descriptions (GIVEN/WHEN/THEN); requirements use SHALL/MUST/SHOULD correctly; each requirement has at least 1 scenario.

If any check fails, re-dispatch the planner with specific feedback.

### Step 6: Task granularity check

- tasks > 20 → warn: 'Change may be too large. Consider splitting into multiple changes.'
- File Manifest files > 15 → warn: 'File manifest exceeds 15 files. Consider splitting.'
- waves > 5 → warn: 'Excessive wave decomposition. Consolidate independent tasks.'
- single-wave task count > 8 → warn: 'Wave too large. Split into multiple waves.'

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

## Output

- \`design.md\` (DS-N + D-N + architecture), \`tasks.md\` (waves + TDD types + RED tests), and delta specs per affected domain.

## Guardrails
- Full mode: MUST dispatch the planner sub-agent. Do NOT write design/tasks/specs yourself.
- Lightweight mode: write templates directly (no sub-agent needed).
- tasks.md boxes must remain UNCHECKED — \`<!-- commit: -->\` placeholders stay empty for the executor.
- Review planner output before committing; if the design is flawed, re-dispatch — do not proceed with a broken design.
- Task granularity is advisory, not blocking — warn on tasks>20/files>15/waves>5/per-wave>8, then let the user decide.
- Level-aware dispatch: Trivial/Light may skip the planner (orchestrator fills templates directly); Standard/Critical MUST dispatch it; Critical adds a security dimension to the design.
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
