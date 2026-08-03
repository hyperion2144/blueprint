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
1. Fetch templates: \`bp template design --stdout\` and \`bp template tasks --stdout\`
2. Fill design.md and tasks.md (1 wave) from templates
3. If any deliverable involves behavioral changes, write delta specs: run \`bp template spec --stdout\` for the format, then create \`specs/<domain>/spec.md\` per affected domain
4. If no behavioral changes, skip delta specs

### Step 4: Review planner output for design quality

Before committing, review the planner's design across FIVE content-quality dimensions. These are NOT format checks (Step 5 handles format) - they assess whether the design is correct, complete, and implementable. A flawed design cascades into implementation failure.

For each dimension, ask the specific questions. If ANY fails, re-dispatch the planner with structured feedback (dimension + specific problem + expected state).

#### Dimension 1: Implementability (can the executor build it without guessing?)

For each DS-N, read its Detailed Design section and ask:
- Are interface signatures complete (parameters, return types, types)?
- For data/state components: are internal state transitions, data structures, and read/write paths described?
- For UI components: are Props, events, and all states (loading/empty/error/success) listed?
- For API/CLI: are parameter validation rules, response format, and error codes specified?
- Are error paths and side effects described (not just the happy path)?
- Does Detailed Design add implementation detail beyond Key Interfaces, or does it just repeat them?

FAIL example: DS-N Detailed Design says only "Implement ThemeContext class" - no state fields, no toggle logic, no persistence strategy. The executor would have to guess everything.

#### Dimension 2: Design Correctness (is the architecture internally consistent?)

- Do DS-N dependencies match the Architecture Diagram's arrows?
- Does the Data Flow section cover every DS-N involved in the flow?
- Do [NEW]/[MODIFIED]/[EXISTING] annotations in the diagram match the File Manifest's Action column?
- Do Core Data Structures match the types used in DS-N Key Interfaces?
- Are there circular dependencies or missing intermediate components?

FAIL example: Architecture Diagram shows DS-2 depends on DS-1, but DS-2's Key Interfaces reference an export that DS-1 does not provide.

#### Dimension 3: Decision Completeness (are all real technical choices recorded?)

Check whether every technical choice with genuine alternatives has a D-N decision record:
- State management approach (Context/Redux/Zustand/...)
- Error handling strategy (try-catch/Result type/either/...)
- Data persistence mechanism (localStorage/IndexedDB/cookie/...)
- Async/concurrency pattern (callbacks/promises/async-await/observables/...)
- Any external dependency introduction (recorded in External Dependencies table?)

For each D-N, verify:
- Reason states the driving constraint/tradeoff (not just "project uses X")
- Alternatives were genuinely considered (not filler like "could also use Y")

FAIL example: Design introduces localStorage persistence but has no D-N deciding "why not cookie/IndexedDB", and no D-N on "sync write vs debounced write".

#### Dimension 4: Impact Completeness (did the planner find all downstream effects?)

- Did the planner run \`bp map impact <module>\` for each modified module? (check the Impact Analysis section references impact queries)
- Direct Impacts: does every File Manifest "Modify" entry appear here with a change description?
- Indirect Impacts: are callers/dependents listed? If a public export's signature changes, Indirect Impacts MUST be non-empty.
- Test Impacts: are existing tests that may break identified?
- Is there a modified public export with empty Indirect Impacts? (likely a missed \`bp map impact\` query)

FAIL example: File Manifest modifies src/core/auth.ts login() signature, but Indirect Impacts is empty (planner didn't run \`bp map impact auth\`).

#### Dimension 5: File Manifest Consistency (does every file trace to a component?)

- Does every DS-N have at least one File Manifest entry with Source: DS-N?
- Does every File Manifest row's Source point to an existing DS-N?
- Are there orphan files (in Manifest but no DS claims them) or orphan components (DS with no files)?
- Any "etc." / "and other files" / "..." vague references? (must be exhaustive)

FAIL example: DS-3 claims responsibility for ThemePersistence, but no File Manifest row has Source: DS-3.

#### If problems found

Re-dispatch the planner with structured feedback per finding:
- Dimension: <1-5 name>
- DS-N / file: <which component or file>
- Problem: <what's wrong>
- Expected: <what the design should show>

After re-dispatch, return to Step 4 to review the updated output. Repeat until the design passes all five dimensions. Do NOT proceed with a flawed design - it will cascade into implementation failures.

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

**Structural Completeness** (format checks - content quality is covered in Step 4):
- No template placeholders remaining in any file
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
