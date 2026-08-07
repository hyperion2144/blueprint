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

### Step 3: Dispatch planner (Full mode)

**If FULL: dispatch the planner sub-agent. Do NOT write design/tasks/specs yourself.** Prepare its context (change name/directory, files to read: proposal.md, global specs, coding conventions, config.yaml; instruction: "Read planner agent prompt, produce design.md, tasks.md, and specs/<domain>/spec.md delta specs under the change directory"). Dispatch a fresh, non-isolated bp-planner (it is read-only on source and writes only to the change directory). The planner queries the codebase map (\`bp map list\`, \`bp map module <name>\`, \`bp map impact <module>\`) and writes the \`## Impact Analysis\` section. Wait for completion.

**If LIGHTWEIGHT:** fetch \`bp template design --stdout\` and \`bp template tasks --stdout\`, fill design.md and tasks.md (1 wave) directly. If any deliverable has behavioral changes, write delta specs per affected domain (fetch \`bp template spec --stdout\` for the format); otherwise skip delta specs.

### Step 4: Review planner output for design quality

Before committing, review the design across FIVE content-quality dimensions (not format — Step 5 handles format). If ANY dimension fails, re-dispatch the planner with structured feedback (dimension + specific problem + expected state) and re-review.

#### Dimension 1: Implementability (can the executor build it without guessing?)

- Are interface signatures complete (parameters, return types, types)?
- Are state transitions, data structures, and read/write paths described for data/state components; Props, events, and all states for UI; validation rules, response format, and error codes for API/CLI?
- Are error paths and side effects described (not just the happy path)?
- Does Detailed Design add detail beyond Key Interfaces, or just repeat them?
- Do Requirements, Constraints, and Acceptance Criteria exist for every DS-N (a binary pass/fail acceptance bar)?

FAIL example: DS-N says only "Implement ThemeContext class" with no state fields, toggle logic, or persistence strategy — the executor would have to guess everything.

#### Dimension 2: Design Correctness (is the architecture internally consistent?)

- Do DS-N dependencies match the Architecture Diagram's arrows?
- Does Data Flow cover every DS-N in the flow?
- Do the diagram's [NEW]/[MODIFIED]/[EXISTING] annotations match the File Manifest's Action column?
- Do Core Data Structures match the DS-N Key Interfaces? Any circular dependencies or missing intermediates?

FAIL example: the diagram shows DS-2 depends on DS-1, but DS-2 references an export DS-1 does not provide.

#### Dimension 3: Decision Completeness (are all real technical choices recorded?)

- Does every technical choice with genuine alternatives have a D-N record (state management, error handling, persistence, async/concurrency, new dependencies)?
- Does each D-N's Reason state the driving constraint/tradeoff, with genuinely considered alternatives?

FAIL example: the design uses localStorage persistence but has no D-N deciding "why not cookie/IndexedDB" or "sync vs debounced write".

#### Dimension 4: Impact Completeness (did the planner find all downstream effects?)

- Did the planner run \`bp map impact <module>\` for each modified module?
- Does every File Manifest "Modify" entry appear in Direct Impacts?
- Are callers/dependents listed in Indirect Impacts? A changed public export with empty Indirect Impacts is a red flag.
- Are existing tests that may break identified in Test Impacts?

FAIL example: File Manifest modifies login()'s signature but Indirect Impacts is empty.

#### Dimension 5: File Manifest Consistency (does every file trace to a component?)

- Does every DS-N have at least one File Manifest entry with \`Source: DS-N\`?
- Does every row's Source point to an existing DS-N? No orphan files or orphan components?
- No "etc." / "and other files" / "..." vague references (must be exhaustive)?

FAIL example: DS-3 claims responsibility for ThemePersistence but no File Manifest row has \`Source: DS-3\`.

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
