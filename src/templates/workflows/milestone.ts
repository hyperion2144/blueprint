import type { SkillTemplate, CommandTemplate } from '../types';

const instructions = `## Input

### Parameters
- **No parameters**: operate on the currently active milestone from \`specwf state\`
- **\`<milestone-id>\`**: switch to a specific milestone

### Prerequisites
- \`specwf/roadmap.md\` must exist with defined milestones

## Steps

### Step 1: Get context
Run \`specwf context milestone\` — outputs JSON with state and roadmap file paths. Read all listed files.

### Step 2: Select milestone
If a milestone ID was provided: run \`specwf state set-milestone <id>\`.
If no ID: run \`specwf state\` to see the current milestone. To switch, use \`specwf state set-milestone <id>\`.

### Step 3: Select phase (optional)
If you need to jump to a specific phase within the milestone: run \`specwf state set-phase <id>\`.

### Step 4: Advance
Run \`specwf continue\` to proceed to the discuss phase for the active milestone/phase.

## When to use milestone vs continue

| Situation | Command |
|-----------|---------|
| Just finished roadmap, want to start first milestone | \`specwf state set-milestone <id>\` then \`specwf continue\` |
| Currently in a milestone, want to advance | \`specwf continue\` |
| Want to switch to a different milestone | \`specwf state set-milestone <id>\` |
| Want to jump to a specific phase | \`specwf state set-phase <id>\` |

## Output
- Updated state.md with new active milestone/phase

## Guardrails
- Switching milestones archives the current one if not yet shipped
- Phase transitions within a milestone do not trigger archival
- After switching, always run \`specwf continue\` to get the next step's instructions`;

export function getMilestoneSkillTemplate(): SkillTemplate {
  return {
    name: 'specwf-milestone',
    description: 'Milestone management — switch/create milestones, set current phase',
    instructions,
  };
}

export function getMilestoneCommandTemplate(): CommandTemplate {
  return {
    name: 'SpecWF: Milestone',
    description: 'Milestone management — switch/create milestones, set current phase',
    category: 'Planning',
    tags: ['specwf', 'milestone', 'planning'],
    content: instructions,
  };
}
