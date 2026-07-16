import type { SkillTemplate, CommandTemplate } from '../types.js';

const instructions = `## Input

- **\`$ARGUMENTS\`** (optional): change name. If empty, find the most recently active change.

## Steps

### Step 1: Find active change

If \`$ARGUMENTS\` is empty:
1. List \`bp/changes/\` (exclude \`archive/\`)
2. If no active changes:
   - Read \`bp/roadmap.md\`
   - Check if roadmap has real content (look for \`## Milestone: M1\` with actual goal text, not template placeholders like \`{{milestone-name}}\`)
   - If roadmap is empty/template: suggest \`bp roadmap\` to define project direction first
   - If roadmap has content: find the first phase with \`[ ]\` changes or \`NOT_STARTED\` status, suggest next change to propose
3. If one active change: use it
4. If multiple active changes: list them and ask the user which one

### Step 2: Check artifact existence

For the resolved change, check which artifacts exist:

\`\`\`bash
ls bp/changes/$1/proposal.md 2>/dev/null
ls bp/changes/$1/design.md 2>/dev/null
ls bp/changes/$1/tasks.md 2>/dev/null
ls bp/changes/$1/specs/ 2>/dev/null
ls bp/changes/$1/review.md 2>/dev/null
\`\`\`

Also check task completion status in tasks.md:
- Count [x] vs [ ] entries
- If all [x] and tests pass -> code is implemented

### Step 3: Determine progress and suggest next step

| Condition | Status | Next Step |
|-----------|--------|-----------|
| No proposal.md | Not started | \`bp propose $1\` |
| proposal.md exists, no design.md | Proposed | \`bp plan $1\` |
| design.md + tasks.md exist, tasks all [ ] | Planned | \`bp apply $1\` |
| Some tasks [x], some [ ] | In progress | \`bp apply $1\` (resume) |
| All tasks [x], no review.md | Implemented | \`bp review $1\` |
| review.md exists, verdict = PASS | Reviewed | \`bp archive $1\` |
| review.md exists, has R/Q/G issues | Needs fix | \`bp apply --fix $1\` |
| review.md exists, has D issues | Needs redesign | \`bp plan --fix $1\` |

### Step 4: Output status and recommendation

\`\`\`
Change: $1

Artifacts:
  proposal.md    (check)
  design.md      (check)
  tasks.md       (check) (3/5 complete)
  specs/         (check) (2 domains)
  review.md      (cross)

Status: In Progress
Next: bp apply $1 (implement remaining 2 tasks)

Run: bp apply $1
\`\`\`

Or if no active change and roadmap is empty:

\`\`\`
No active changes.

Roadmap is not yet defined. Define your project direction first.

Run: bp roadmap
\`\`\`

Or if no active change and roadmap has content:

\`\`\`
No active changes.

Roadmap:
  M1 - Core Engine [ACTIVE]
    P1.1 - Auth System [IN_PROGRESS] (3/4 changes done)
      Next: add-password-reset

Suggest: bp propose add-password-reset --phase M1/P1.1
\`\`\`

## Guardrails

- **continue only SUGGESTS.** It does not execute the next step automatically.
- **If multiple changes are active**, let the user choose. Don't auto-pick.
- **If tasks are partially complete**, suggest \`bp apply\` to resume (executor will skip [x] tasks).
- **If review has issues**, suggest the correct fix command based on issue type (D -> plan --fix, R/Q/G -> apply --fix).
- **If no active changes and roadmap is empty/template**, suggest \`bp roadmap\` to define direction first.
- **If no active changes and roadmap has content**, suggest the next change based on roadmap. Don't create it automatically.
`;

export function getContinueSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-continue',
    description: 'Check progress and suggest next step (artifact-based, no state machine)',
    instructions,
  };
}

export function getContinueCommandTemplate(): CommandTemplate {
  return {
    description: 'Check progress and suggest next step (artifact-based, no state machine)',
    category: 'Workflow',
    tags: ['bp', 'continue', 'progress', 'artifact'],
    content: instructions,
  };
}
