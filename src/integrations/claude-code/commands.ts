/**
 * claude-code/commands.ts — Claude Code command file generator
 *
 * Generates .claude/commands/bp-<step>.md files for each workflow step.
 * Claude Code natively supports .claude/commands/ as slash-command triggers.
 * Parameters kept as $1/$ARGUMENTS (Claude Code native format).
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

export interface ClaudeCommandDef {
  step: string;
  name: string;
  description: string;
  argumentHint?: string;
}

const STEPS: ClaudeCommandDef[] = [
  { step: 'init', name: 'bp:init', description: 'Initialize blueprint project structure and generate platform files' },
  { step: 'roadmap', name: 'bp:roadmap', description: 'View or modify roadmap.md' },
  { step: 'propose', name: 'bp:propose', description: 'Create a change folder with proposal.md', argumentHint: '[change-name]' },
  { step: 'plan', name: 'bp:plan', description: 'Dispatch planner sub-agent (produce design, tasks, delta specs)', argumentHint: '[change-name]' },
  { step: 'apply', name: 'bp:apply', description: 'Dispatch executor sub-agents (implement tasks per wave)', argumentHint: '[change-name]' },
  { step: 'review', name: 'bp:review', description: 'Triple review of a change - outputs dispatch instructions', argumentHint: '[change-name]' },
  { step: 'archive', name: 'bp:archive', description: 'Archive a change (merge delta specs, archive dir, update roadmap)', argumentHint: '[change-name]' },
  { step: 'continue', name: 'bp:continue', description: 'Check progress and suggest next step', argumentHint: '[change-name]' },
];

export function generateClaudeCommand(def: ClaudeCommandDef): string {
  const entry = WORKFLOW_REGISTRY[def.step as WorkflowStep];
  const body = entry ? entry.command().content : `# ${def.description}\n\nWorkflow guide for the \`${def.step}\` step.`;
  const lines = ['---', `name: ${def.name}`, `description: ${def.description}`];
  if (def.argumentHint) {
    lines.push(`argument-hint: "${def.argumentHint}"`);
  }
  lines.push('---', '', body);
  return lines.join('\n');
}

export function generateClaudeCommands(_config: ProjectConfig): { path: string; content: string }[] {
  return STEPS.map((def) => ({
    path: `.claude/commands/bp-${def.step}.md`,
    content: generateClaudeCommand(def),
  }));
}
