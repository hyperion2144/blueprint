/**
 * OMP command generator
 * Generates .omp/commands/bp-<step>.md files (11 slash commands).
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

/** 11 step definitions */
export const STEP_DEFS: CommandDef[] = [
  { step: 'init', name: 'bp:init', description: 'Initialize blueprint project structure and generate platform files', usesAgent: false, agents: [] },
  { step: 'roadmap', name: 'bp:roadmap', description: 'View or modify roadmap.md', usesAgent: false, agents: [] },
  { step: 'propose', name: 'bp:propose', description: 'Create a change folder with proposal.md', usesAgent: false, agents: [], argumentHint: '[change-name]' },
  { step: 'plan', name: 'bp:plan', description: 'Dispatch planner sub-agent (produce design, tasks, delta specs)', usesAgent: true, agents: ['planner'], argumentHint: '[change-name]' },
  { step: 'apply', name: 'bp:apply', description: 'Dispatch executor sub-agents (implement tasks per wave)', usesAgent: true, agents: ['executor'], argumentHint: '[change-name]' },
  { step: 'check', name: 'bp:check', description: 'Triple check of a change - full verify + fixer loopback + full re-review', usesAgent: true, agents: ['reviewer', 'fixer'], argumentHint: '[change-name]' },
  { step: 'archive', name: 'bp:archive', description: 'Archive a change (merge delta specs, archive dir, update roadmap)', usesAgent: false, agents: [], argumentHint: '[change-name]' },
  { step: 'continue', name: 'bp:continue', description: 'Check progress and suggest next step', usesAgent: false, agents: [], argumentHint: '[change-name]' },
  { step: 'ff', name: 'bp:ff', description: 'Fast-forward - auto-advance through all steps by running bp continue after each', usesAgent: false, agents: [] },
  { step: 'loop', name: 'bp:loop', description: 'Autonomous loop - same as ff but skip all user interaction until roadmap complete', usesAgent: false, agents: [] },
  { step: 'refactor', name: 'bp:refactor', description: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module', usesAgent: false, agents: [], argumentHint: '<target>' },
  { step: 'design', name: 'bp:design', description: 'Design system consultation - complete design proposal written to root DESIGN.md', usesAgent: true, agents: ['designer'] },
  { step: 'design-html', name: 'bp:design-html', description: 'Design to production HTML/CSS - implement DESIGN.md against the detected project framework', usesAgent: true, agents: ['designer'] },
  { step: 'design-review', name: 'bp:design-review', description: "Designer's-eye QA audit - full visual and UX audit against DESIGN.md", usesAgent: true, agents: ['designer'], argumentHint: '[change-name]' },
  { step: 'design-shotgun', name: 'bp:design-shotgun', description: 'Multi-variant design exploration - generate, compare, and approve design variants', usesAgent: true, agents: ['designer'] },
  { step: 'plan-design-review', name: 'bp:plan-design-review', description: 'Plan-phase UI audit - UI scope detection and 0-10 rating before implementation', usesAgent: true, agents: ['designer'], argumentHint: '[change-name]' },
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
