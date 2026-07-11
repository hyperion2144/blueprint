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
  { step: 'init', name: 'bp:init', description: 'Initialize bp project structure and generate platform files', usesAgent: true, agents: ['researcher'] },
  { step: 'grill', name: 'bp:grill', description: 'Requirements exploration — detailed questioning until shared understanding', usesAgent: false, agents: [] },
  { step: 'research', name: 'bp:research', description: 'Project-level technical research — parallel multi-direction investigation', usesAgent: true, agents: ['researcher'] },
  { step: 'roadmap', name: 'bp:roadmap', description: 'Roadmap definition — split project into Milestones × Phases', usesAgent: false, agents: [] },
  { step: 'milestone', name: 'bp:milestone', description: '[milestone-id] — Milestone management — switch/create milestones, set current phase', usesAgent: false, agents: [], argumentHint: '[milestone-id]' },
  { step: 'design', name: 'bp:design', description: 'UI design direction — define aesthetic, color, typography, layout', usesAgent: true, agents: ['designer'], argumentHint: '' },
  { step: 'discuss', name: 'bp:discuss', description: 'Phase discussion — capture implementation decisions into context.md', usesAgent: false, agents: [] },
  { step: 'research-phase', name: 'bp:research-phase', description: 'Phase research — implementation path investigation', usesAgent: true, agents: ['researcher'] },
  { step: 'split', name: 'bp:split', description: 'Change splitting — dependency graph + N changes', usesAgent: false, agents: [] },
  { step: 'adhoc', name: 'bp:adhoc', description: '[change-name] — Create adhoc change — independent change unrelated to milestone/phase', usesAgent: false, agents: [], argumentHint: '[change-name]' },
  { step: 'plan', name: 'bp:plan', description: '[change-name] — Change design — technical design + task breakdown + delta-specs', usesAgent: true, agents: ['planner'], argumentHint: '[change-name]' },
  { step: 'apply', name: 'bp:apply', description: '[change-name] — Code implementation — TDD RED→GREEN→REFACTOR', usesAgent: true, agents: ['executor'], argumentHint: '[change-name]' },
  { step: 'review', name: 'bp:review', description: '[change-name] — Triple review — spec/quality/goal reviews in parallel', usesAgent: true, agents: ['reviewer'], argumentHint: '[change-name]' },
  { step: 'archive', name: 'bp:archive', description: '[change-name] — Verify & archive — run checks, then delta-spec merge + directory move + state update', usesAgent: false, agents: [], argumentHint: '[change-name]' },
  { step: 'ship', name: 'bp:ship', description: 'Ship — create PR + update state / release tag', usesAgent: false, agents: [] },
  { step: 'continue', name: 'bp:continue', description: '[change-name] [--auto] — Auto-advance — read STATE and route to next step', usesAgent: false, agents: [], argumentHint: '[change-name] [--auto]' },
  { step: 'audit', name: 'bp:audit', description: '[change-name|phase-id|milestone-id] — Human UAT verification — generate uat.md, interactive testing, adhoc fixes', usesAgent: false, agents: [], argumentHint: '[change-name|phase-id|milestone-id]' },
  { step: 'loop', name: 'bp:loop', description: 'Autonomous loop — auto-advance all steps, AI fills decisions without asking', usesAgent: false, agents: [] },
  { step: 'commit', name: 'bp:commit', description: 'Commit changes — conventional commits + hash recording to tasks.md', usesAgent: false, agents: [] },
  { step: 'proposal', name: 'bp:proposal', description: '[change-name] — Fill change proposal — intent, scope, approach, must-haves, non-goals', usesAgent: false, agents: [], argumentHint: '[change-name]' },
  { step: 'config', name: 'bp:config', description: 'Interactive configuration — set workflow, model, conventions, etc.', usesAgent: false, agents: [] },
  { step: 'fix-plan', name: 'bp:fix-plan', description: '[change-name] — Fix design — correct architecture/approach based on review BLOCKERs', usesAgent: true, agents: ['planner'], argumentHint: '[change-name]' },
  { step: 'fix-apply', name: 'bp:fix-apply', description: '[change-name] — Fix implementation — wave-based dispatch for review finding fixes', usesAgent: true, agents: ['executor'], argumentHint: '[change-name]' },
  { step: 'upgrade', name: 'bp:upgrade', description: 'Upgrade output files — check unarchived files against templates + PEG grammars, auto-fix format mismatches', usesAgent: true, agents: [], argumentHint: '[--scope] [--dry-run]' },
  { step: 'add-phase', name: 'bp:add-phase', description: 'Add phase — insert a new phase into the current milestone, renumber subsequent phases, rename directories, update roadmap and state', usesAgent: true, agents: [], argumentHint: '' },
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
