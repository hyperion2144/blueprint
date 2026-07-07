/**
 * Shared constants for workflow templates — eliminates cross-template duplication.
 *
 * Follows the ORCHESTRATOR_RULE pattern from types.ts.
 */

/** Change name + context resolution — replaces repeated paragraphs in plan/apply/review/verify/archive. */
export const CHANGE_NAME_RESOLVE = (status: string, step: string): string => `### Resolve change
If \`$ARGUMENTS\` is non-empty: use as change name directly.
If empty: run \`bp state\`, read \`pending\` array, filter by status \`${status}\`, pick first or ask user.

**Resolved path formulas**:
- Phase change directory:  \`bp/milestones/<milestone>/phases/<phase>/changes/<name>/\`
- Adhoc change directory:  \`bp/changes/<name>/\`
- Run \`bp context ${step}\` for resolved paths in the \`dirs:\` section.

Then run \`bp context ${step}\` and read all listed files.

`;

/** Lightweight/Full classification — replaces repeated classification in plan/apply/review/verify. */
export const CLASSIFY_CHANGE = `### Classify change
Read \`tasks.md\` task types:
- **Lightweight**: ALL tasks type: config|docs|refactor|scaffolding — no type:behavior
- **Full**: any type:behavior task

`;
/** Change path resolution — replaces path construction in plan/apply. */
export const RESOLVE_PATHS = `### Resolve paths
Run \`bp state\` for \`milestone\` and \`phase\`. Or run \`bp context <step>\` for complete path listing.

Directory layout:
  milestone dir:   bp/milestones/[BP:MILESTONE_ID]/
  phase dir:       bp/milestones/[BP:MILESTONE_ID]/phases/[BP:PHASE_ID]/
  change dir:      bp/milestones/[BP:MILESTONE_ID]/phases/[BP:PHASE_ID]/changes/[BP:CHANGE_NAME]/
  |-- proposal.md, design.md, tasks.md, change-summary.md
  |-- spec-review.md, quality-review.md, goal-review.md
  |-- verification.md
  adhoc change:    bp/changes/<change-name>/
  archive dir:     bp/archive/[BP:MILESTONE_ID]/[BP:PHASE_ID]/

Current change directory for this step:
\`[BP:CHANGE_DIR]\`

`;

/** Read context before designing — replaces repeated "read before design" in plan. */
export const READ_CONTEXT = `### Read context — MUST read before designing
Read these to ensure alignment with prior decisions:
- \`bp/requirements.md\` — project requirements, constraints, success criteria
- \`bp/roadmap.md\` — this phase's goal, scope, and deliverables
- \`bp/milestones/[BP:MILESTONE_ID]/phases/[BP:PHASE_ID]/research.md\` — implementation research
- \`bp/milestones/[BP:MILESTONE_ID]/phases/[BP:PHASE_ID]/context.md\` — locked decisions from discuss phase

Change files (relative to [BP:CHANGE_DIR]):
- \`proposal.md\` — intent, scope, approach, must-haves
- \`design.md\` — technical architecture, data flow, approach
- \`tasks.md\` — task list with waves, types, acceptance criteria
- \`specs/<domain>/spec.md\` — delta-specs for affected domain
- \`change-summary.md\` — apply completion summary
- \`verification.md\` — final verification report

Never design in isolation — design must trace back to requirements and research.

`;

/** Commit + advance — replaces each template's trailing commit and advance steps. */
export const COMMIT_ADVANCE = (scope: string, desc: string): string => `### Commit & advance

Read \`bp/project.yml\` — check \`workflow.commitDocs\` setting.

**If \`commitDocs\` is \`false\`:** skip commit, run \`bp continue\` directly.

**If \`commitDocs\` is \`true\` (or not set, default true):**
\`\`\`bash
bp commit "docs(${scope}): ${desc}" --files "<files>" --scope ${scope} --record
\`\`\`
Run \`bp continue\` to proceed.
`;

/** Truncation guard — replaces repeated ---END--- check in continue/auto. */
export const TRUNCATION_GUARD = `**Check output completeness**: Confirm \`---END---\` marker exists and \`chars:\` value matches. Missing or mismatched = output truncated — re-run the command.
`;

/** Wave-based task dispatch for apply/fix-apply — main agent splits tasks.md into waves, dispatches one sub-agent per wave. */
export const WAVE_SPLIT = `### Step: Wave analysis (MAIN AGENT)

Read \`tasks.md\` (or \`review-task.md\` for fix mode). Parse into execution plan:

1. **Extract waves**: read all \`## Wave N: <theme>\` sections. Keep wave order.

2. **Build inter-wave dependency graph**:
   - For each task, extract \`depends_on\` field
   - If task in Wave B has \`depends_on\` referencing a task in Wave A → Wave B depends on Wave A
   - Result: DAG where nodes = waves, edges = cross-wave depends_on

3. **Generate execution plan**:
   - Waves with NO unmet cross-wave dependencies → can run concurrently
   - Waves WITH cross-wave dependencies → must wait for predecessor wave(s)

4. **For each wave, prepare ONE sub-agent prompt**:
   - Change name and path
   - ALL tasks in this wave (ids, types, descriptions, files, acceptance, RED tests)
   - ALL referenced specs (from spec_ref fields across tasks)
   - Conventions
   - Instruction: implement tasks in dependency order within the wave
   - Instruction: after each task, commit with \`bp commit "<type>(<scope>): <description>" --files <changed-files> --task <id> --tasks-path <tasks.md path> --record\`
   - Instruction: do NOT run tsc/vitest — main agent handles verify

5. **Execute round by round**:
   - Each round: dispatch all ready waves CONCURRENTLY (task tool, one agent per wave)
   - Wait for all; then **verify each sub-agent's output** (git log, git diff, tasks.md marking, test pass)
   - Then run full round verify (tsc + vitest) + mark \`[x]\` + commit
   - Next round: waves unblocked after predecessor waves complete
   - Repeat until all waves done

`;

/** Review loopback guidance — what to do when review finds issues. */
export const REVIEW_LOOPBACK = `### Review loopback

If any review report is FAIL or NEEDS_REVISION, ALL non-PASS findings must be addressed.
Determine loopback type:

**reapply (code fix)**: implementation bugs → fix code
  1. **Write \`review-task.md\`** (main agent does this):
     - Get template: \`bp template tasks --stdout\`
     - Replace title: \`# Fix Tasks: [BP:CHANGE_NAME]\`
     - Write one task per non-PASS finding from ALL THREE review files:
       - spec-review.md: FAIL constraints, N/A gaps with file:line
       - quality-review.md: BLOCKER, MAJOR, MINOR issues with file:line
       - goal-review.md: PARTIAL, NOT_ACHIEVED goals with file:line
     - Wave 1 = BLOCKER + FAIL (must fix), Wave 2 = MAJOR + PARTIAL (should fix), Wave 3 = MINOR + INFO + NOT_APPLICABLE gaps
     - Each task references the review finding it addresses (e.g. \`spec_ref: spec-review.md#2\`)
     - Use same task format as tasks.md (type, description, files, acceptance, RED test, depends_on)
  2. **Run the loopback CLI command**: \`bp continue change <name> --command reapply\`
     - This advances the state machine to \`change-fix-applying\`
     - The command outputs the fix-apply workflow instructions
  3. **Follow the instructions** from the CLI output
  4. After fix-apply completes → \`bp continue change <name>\` → re-review with --fix

**replan (design fix)**: architecture/approach wrong → redesign
  1. **Run the loopback CLI command**: \`bp continue change <name> --command replan\`
     - This advances the state machine to \`change-fix-planning\`
     - The command outputs the fix-plan workflow instructions
  2. **Follow the instructions** from the CLI output
  3. After fix-apply completes → \`bp continue change <name>\` → re-review with --fix

Re-review (--fix): do NOT create new review files. In the ORIGINAL files, mark resolved findings \`✅ 已修复\`, append new findings with continued numbering.
If any report is still FAIL or NEEDS_REVISION → loop back. If all PASS → advance to archive.

`;

/** Adhoc vs Phase change guide — clarifies directory types. */
export const CHANGE_TYPE_GUIDE = `## Change Types: Directory Guide

Blueprint has two change types with different directory structures:

| Type | How to create | Directory path |
|------|--------------|----------------|
| **Phase change** | \`bp change new <name> --milestone <mid> --phase <pid>\` | \`bp/milestones/<mid>/phases/<pid>/changes/<name>/\` |
| **Adhoc change** | \`bp change new <name>\` (no milestone/phase) | \`bp/changes/<name>/\` |

How to tell: check \`bp state\` output's \`ref:\` field. Starts with \`milestones/\` → **phase change**. Starts with \`changes/\` → **adhoc change**.

`;
