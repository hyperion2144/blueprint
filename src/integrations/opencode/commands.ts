/**
 * opencode/commands.ts - OpenCode command file generator
 *
 * Generates .opencode/commands/bp-<step>.md files for each workflow step.
 * OpenCode natively supports .opencode/commands/ as slash-command triggers.
 * Parameters kept as $ARGUMENTS / $1 (OpenCode native format).
 *
 * Frontmatter fields: description (required), agent (optional), model (optional).
 * The filename (without .md) becomes the command name.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

export interface OpenCodeCommandDef {
  step: string;
  description: string;
  argumentHint?: string;
}

const STEPS: OpenCodeCommandDef[] = [
  { step: 'init', description: 'Initialize blueprint project structure and generate platform files' },
  { step: 'roadmap', description: 'View or modify roadmap.md' },
  { step: 'propose', description: 'Create a change folder with proposal.md', argumentHint: '[change-name]' },
  { step: 'plan', description: 'Dispatch planner sub-agent (produce design, tasks, delta specs)', argumentHint: '[change-name]' },
  { step: 'apply', description: 'Dispatch executor sub-agents (implement tasks per wave)', argumentHint: '[change-name]' },
  { step: 'check', description: 'Triple check of a change - full verify + fixer loopback + full re-review', argumentHint: '[change-name]' },
  { step: 'archive', description: 'Archive a change (merge delta specs, archive dir, update roadmap)', argumentHint: '[change-name]' },
  { step: 'continue', description: 'Check progress and suggest next step', argumentHint: '[change-name]' },
  { step: 'ff', description: 'Fast-forward: auto-advance through all steps by calling bp continue after each' },
  { step: 'loop', description: 'Autonomous loop: same as ff but skip all user interaction until roadmap complete' },
  { step: 'refactor', description: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module', argumentHint: '<target>' },
];

export function generateOpenCodeCommand(def: OpenCodeCommandDef): string {
  const entry = WORKFLOW_REGISTRY[def.step as WorkflowStep];
  const body = entry ? entry.command().content : `# ${def.description}\n\nWorkflow guide for the \`${def.step}\` step.`;
  const lines = ['---', `description: ${def.description}`];
  lines.push('---', '', body);
  return lines.join('\n');
}

export function generateOpenCodeCommands(_config: ProjectConfig): { path: string; content: string }[] {
  return STEPS.map((def) => ({
    path: `.opencode/commands/bp-${def.step}.md`,
    content: generateOpenCodeCommand(def),
  }));
}
