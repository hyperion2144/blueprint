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
  { step: 'init', name: 'bp:init', description: 'Initialize bp project structure and generate platform files' },
  { step: 'grill', name: 'bp:grill', description: 'Requirements exploration — detailed questioning until shared understanding' },
  { step: 'research', name: 'bp:research', description: 'Project-level technical research — parallel multi-direction investigation' },
  { step: 'roadmap', name: 'bp:roadmap', description: 'Roadmap definition — split project into Milestones × Phases' },
  { step: 'milestone', name: 'bp:milestone', description: 'Milestone management — switch/create milestones, set current phase', argumentHint: '[milestone-id]' },
  { step: 'design', name: 'bp:design', description: 'UI design direction — define aesthetic, color, typography, layout', argumentHint: '' },
  { step: 'discuss', name: 'bp:discuss', description: 'Phase discussion — capture implementation decisions into context.md' },
  { step: 'research-phase', name: 'bp:research-phase', description: 'Phase research — implementation path investigation' },
  { step: 'split', name: 'bp:split', description: 'Change splitting — dependency graph + N changes' },
  { step: 'adhoc', name: 'bp:adhoc', description: 'Create adhoc change — independent change unrelated to milestone/phase', argumentHint: '[change-name]' },
  { step: 'plan', name: 'bp:plan', description: 'Change design — technical design + task breakdown + delta-specs', argumentHint: '[change-name]' },
  { step: 'apply', name: 'bp:apply', description: 'Code implementation — TDD RED→GREEN→REFACTOR', argumentHint: '[change-name]' },
  { step: 'review', name: 'bp:review', description: 'Triple review — spec/quality/goal reviews in parallel', argumentHint: '[change-name]' },
  { step: 'archive', name: 'bp:archive', description: 'Verify and archive — run checks, then delta-spec merge + directory move + state update', argumentHint: '[change-name]' },
  { step: 'proposal', name: 'bp:proposal', description: 'Fill change proposal — intent, scope, approach, must-haves, non-goals', argumentHint: '[change-name]' },
  { step: 'ship', name: 'bp:ship', description: 'Ship — create PR + update state / release tag' },
  { step: 'continue', name: 'bp:continue', description: 'Auto-advance — read STATE and route to next step', argumentHint: '[change-name] [--auto]' },
  { step: 'audit', name: 'bp:audit', description: 'Human UAT verification — generate uat.md, interactive testing, create adhoc fixes' },
  { step: 'loop', name: 'bp:loop', description: 'Autonomous loop — auto-advance all steps, AI fills decisions without asking' },
  { step: 'config', name: 'bp:config', description: 'Interactive configuration — set workflow, model, conventions, etc.' },
  { step: 'commit', name: 'bp:commit', description: 'Commit changes — conventional commits + hash recording to tasks.md' },
  { step: 'fix-plan', name: 'bp:fix-plan', description: 'Fix design — correct architecture/approach based on review BLOCKERs', argumentHint: '[change-name]' },
  { step: 'fix-apply', name: 'bp:fix-apply', description: 'Fix implementation — wave-based dispatch for review finding fixes', argumentHint: '[change-name]' },
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
