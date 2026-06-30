/**
 * OMP command generator
 * Generates .omp/commands/specwf-<step>.md files (16 slash commands).
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

/** 16 step definitions */
export const STEP_DEFS: CommandDef[] = [
  { step: 'init', name: 'specwf:init', description: 'Initialize specwf project structure and generate platform files', usesAgent: true, agents: ['researcher'] },
  { step: 'grill', name: 'specwf:grill', description: 'Requirements exploration — detailed questioning until shared understanding', usesAgent: false, agents: [] },
  { step: 'research', name: 'specwf:research', description: 'Project-level technical research — parallel multi-direction investigation', usesAgent: true, agents: ['researcher'] },
  { step: 'roadmap', name: 'specwf:roadmap', description: 'Roadmap definition — split project into Milestones × Phases', usesAgent: false, agents: [] },
  { step: 'milestone', name: 'specwf:milestone', description: 'Milestone management — switch/create milestones, set current phase', usesAgent: false, agents: [] },
  { step: 'discuss', name: 'specwf:discuss', description: 'Phase discussion — capture implementation decisions into context.md', usesAgent: false, agents: [] },
  { step: 'research-phase', name: 'specwf:research-phase', description: 'Phase research — implementation path investigation', usesAgent: true, agents: ['researcher'] },
  { step: 'split', name: 'specwf:split', description: 'Change splitting — dependency graph + N changes', usesAgent: false, agents: [] },
  { step: 'adhoc', name: 'specwf:adhoc', description: 'Create adhoc change — independent change unrelated to milestone/phase', usesAgent: false, agents: [] },
  { step: 'plan', name: 'specwf:plan', description: 'Change design — technical design + task breakdown + delta-specs', usesAgent: true, agents: ['planner'] },
  { step: 'apply', name: 'specwf:apply', description: 'Code implementation — TDD RED→GREEN→REFACTOR', usesAgent: true, agents: ['executor'] },
  { step: 'review', name: 'specwf:review', description: 'Triple review — spec/quality/goal reviews in parallel', usesAgent: true, agents: ['reviewer'] },
  { step: 'verify', name: 'specwf:verify', description: 'Test verification — diagnose root cause + route loopback', usesAgent: true, agents: ['verifier'] },
  { step: 'archive', name: 'specwf:archive', description: 'Archive — delta-spec merge + code cognition backfill', usesAgent: false, agents: [] },
  { step: 'ship', name: 'specwf:ship', description: 'Ship — create PR + update state / release tag', usesAgent: false, agents: [] },
  { step: 'continue', name: 'specwf:continue', description: 'Auto-advance — read STATE and route to next step', usesAgent: false, agents: [] },
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
    ? `Dispatch \`specwf-${def.agents[0]}\` sub-agent via task tool.`
    : 'This step does not use sub-agents.';
  return `# ${def.description}

## Input

- state.md status is correct
- All prerequisite steps are complete

## Steps

### Step 1: Check state
Run \`specwf state\` to verify current position.

### Step 2: Get context
Run \`specwf context ${def.step}\` to read the file manifest.

### Step 3: Execute
Run \`specwf ${def.step}\` to perform the step.

## Sub-agents

${agentsSection}

## Output

Check \`specwf state\` for updated status.

## Advance

Run \`specwf continue\` to proceed to the next step.
`;
}

/** Generate all command files */
export function generateAllCommands(config: ProjectConfig): { path: string; content: string }[] {
  return STEP_DEFS.map((def) => ({
    path: `.omp/commands/specwf-${def.step}.md`,
    content: generateSlashCommand(def, config),
  }));
}
