/**
 * OMP command generator
 * Generates .omp/commands/bp-<step>.md files (16 slash commands).
 *
 * Templates are imported from TypeScript modules in src/templates/workflows/
 * instead of reading markdown files — following OpenSpec's pattern.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

export interface CommandDef {
  step: string;
  name: string;
  description: string;
  usesAgent: boolean;
  agents: string[];
}

/** 19 step definitions */
export const STEP_DEFS: CommandDef[] = [
  { step: 'init', name: 'bp:init', description: 'Initialize bp project structure and generate platform files', usesAgent: true, agents: ['researcher'] },
  { step: 'grill', name: 'bp:grill', description: 'Requirements exploration — detailed questioning until shared understanding', usesAgent: false, agents: [] },
  { step: 'research', name: 'bp:research', description: 'Project-level technical research — parallel multi-direction investigation', usesAgent: true, agents: ['researcher'] },
  { step: 'roadmap', name: 'bp:roadmap', description: 'Roadmap definition — split project into Milestones × Phases', usesAgent: false, agents: [] },
  { step: 'milestone', name: 'bp:milestone', description: 'Milestone management — switch/create milestones, set current phase', usesAgent: false, agents: [] },
  { step: 'discuss', name: 'bp:discuss', description: 'Phase discussion — capture implementation decisions into context.md', usesAgent: false, agents: [] },
  { step: 'research-phase', name: 'bp:research-phase', description: 'Phase research — implementation path investigation', usesAgent: true, agents: ['researcher'] },
  { step: 'split', name: 'bp:split', description: 'Change splitting — dependency graph + N changes', usesAgent: false, agents: [] },
  { step: 'adhoc', name: 'bp:adhoc', description: 'Create adhoc change — independent change unrelated to milestone/phase', usesAgent: false, agents: [] },
  { step: 'plan', name: 'bp:plan', description: 'Change design — technical design + task breakdown + delta-specs', usesAgent: true, agents: ['planner'] },
  { step: 'apply', name: 'bp:apply', description: 'Code implementation — TDD RED→GREEN→REFACTOR', usesAgent: true, agents: ['executor'] },
  { step: 'review', name: 'bp:review', description: 'Triple review — spec/quality/goal reviews in parallel', usesAgent: true, agents: ['reviewer'] },
  { step: 'archive', name: 'bp:archive', description: 'Verify & archive — run checks, then delta-spec merge + directory move + state update', usesAgent: false, agents: [] },
  { step: 'ship', name: 'bp:ship', description: 'Ship — create PR + update state / release tag', usesAgent: false, agents: [] },
  { step: 'continue', name: 'bp:continue', description: 'Auto-advance — read STATE and route to next step', usesAgent: false, agents: [] },
  { step: 'audit', name: 'bp:audit', description: 'Human UAT verification — generate uat.md, interactive testing, adhoc fixes', usesAgent: true, agents: [] },
  { step: 'auto', name: 'bp:auto', description: 'Fully autonomous mode — auto-advance through all steps, AI fills all decisions', usesAgent: false, agents: [] },
  { step: 'commit', name: 'bp:commit', description: 'Commit changes — conventional commits + hash recording to tasks.md', usesAgent: false, agents: [] },
];

/** Generate a single slash command file content from the TypeScript template */
export function generateSlashCommand(def: CommandDef, _config: ProjectConfig): string {
  const entry = WORKFLOW_REGISTRY[def.step as WorkflowStep];
  const body = entry ? entry.command().content : fallbackBody(def);
  return `---
name: ${def.name}
description: ${def.description}
---

${body}
`;
}

function fallbackBody(def: CommandDef): string {
  const agentsSection = def.usesAgent && def.agents.length > 0
    ? `Dispatch \`bp-${def.agents[0]}\` sub-agent via task tool.`
    : 'This step does not use sub-agents.';
  return `# ${def.description}

## Input

- state.md status is correct
- All prerequisite steps are complete

## Steps

### Step 1: Check state
Run \`bp state\` to verify current position.

### Step 2: Get context
Run \`bp context ${def.step}\` to read the file manifest.

### Step 3: Execute
Run \`bp ${def.step}\` to perform the step.

## Sub-agents

${agentsSection}

## Output

Check \`bp state\` for updated status.

## Advance

Run \`bp continue\` to proceed to the next step.
`;
}

/** Generate all command files */
export function generateAllCommands(config: ProjectConfig): { path: string; content: string }[] {
  return STEP_DEFS.map((def) => ({
    path: `.omp/commands/bp-${def.step}.md`,
    content: generateSlashCommand(def, config),
  }));
}
