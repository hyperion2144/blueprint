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
  argumentHint?: string;
}

/** 22 step definitions */
export const STEP_DEFS: CommandDef[] = [
  { step: 'init', name: 'bp:init', description: 'Initialize blueprint project structure and generate platform files', usesAgent: false, agents: [] },
  { step: 'roadmap', name: 'bp:roadmap', description: 'View or modify roadmap.md', usesAgent: false, agents: [] },
  { step: 'propose', name: 'bp:propose', description: 'Create a change folder with proposal.md', usesAgent: false, agents: [], argumentHint: '[change-name]' },
  { step: 'plan', name: 'bp:plan', description: 'Dispatch planner sub-agent (produce design, tasks, delta specs)', usesAgent: true, agents: ['planner'], argumentHint: '[change-name]' },
  { step: 'apply', name: 'bp:apply', description: 'Dispatch executor sub-agents (implement tasks per wave)', usesAgent: true, agents: ['executor'], argumentHint: '[change-name]' },
  { step: 'review', name: 'bp:review', description: 'Triple review of a change - outputs dispatch instructions', usesAgent: true, agents: ['reviewer'], argumentHint: '[change-name]' },
  { step: 'archive', name: 'bp:archive', description: 'Archive a change (merge delta specs, archive dir, update roadmap)', usesAgent: false, agents: [], argumentHint: '[change-name]' },
  { step: 'continue', name: 'bp:continue', description: 'Check progress and suggest next step', usesAgent: false, agents: [], argumentHint: '[change-name]' },
];

function fallbackBody(def: CommandDef): string {
  return `# ${def.description}\n\nWorkflow guide for \`${def.step}\`.`;
}

/** Generate a single slash command file content from the TypeScript template */
export function generateSlashCommand(def: CommandDef, _config: ProjectConfig): string {
  const entry = WORKFLOW_REGISTRY[def.step as WorkflowStep];
  const body = entry ? entry.command().content : fallbackBody(def);
  const lines = [
    '---',
    `name: ${def.name}`,
    `description: ${def.description}`,
  ];
  if (def.argumentHint) {
    lines.push(`argument-hint: "${def.argumentHint}"`);
  }
  lines.push('---', '', body);
  return lines.join('\n');
}

/** Generate all command files */
export function generateAllCommands(config: ProjectConfig): { path: string; content: string }[] {
  return STEP_DEFS.map((def) => ({
    path: `.omp/commands/bp-${def.step}.md`,
    content: generateSlashCommand(def, config),
  }));
}
