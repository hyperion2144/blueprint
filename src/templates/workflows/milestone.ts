import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the currently active milestone from \`bp state\`
- **\`<milestone-id>\`**: switch to a specific milestone

### Prerequisites
- \`bp/roadmap.md\` must exist with defined milestones

## Steps

### Step 1: Get context
Run \`bp context milestone\` — outputs state and roadmap file paths. Read all listed files.

### Step 2: Select milestone
If a milestone ID was provided: run \`bp state set-milestone <id>\`.
If no ID: run \`bp state\` to see the current milestone. To switch, use \`bp state set-milestone <id>\`.

### Step 3: Select phase (optional)
If you need to jump to a specific phase within the milestone: run \`bp state set-phase <id>\`.

### Step 4: Advance
Run \`bp continue\` to proceed to the discuss phase for the active milestone/phase.

## When to use milestone vs continue

| Situation | Command |
|-----------|---------|
| Just finished roadmap, want to start first milestone | \`bp state set-milestone <id>\` → \`bp state set-phase <phase-id>\` → \`bp continue\` |
| Currently in a milestone, want to advance | \`bp continue\` |
| Want to switch to a different milestone | \`bp state set-milestone <id>\` |
| Want to jump to a specific phase | \`bp state set-phase <id>\` |

## Output
- Updated state.md with new active milestone/phase

## Guardrails
- Switching milestones archives the current one if not yet shipped
- Phase transitions within a milestone do not trigger archival
- After switching, always run \`bp continue\` to get the next step's instructions`;

export function getMilestoneSkillTemplate(): SkillTemplate {
  return {
    name: 'bp-milestone',
    description: 'Milestone management — switch/create milestones, set current phase',
    instructions,
  };
}

export function getMilestoneCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Milestone',
    description: 'Milestone management — switch/create milestones, set current phase',
    category: 'Planning',
    tags: ['bp', 'milestone', 'planning'],
    content: instructions,
  };
}
