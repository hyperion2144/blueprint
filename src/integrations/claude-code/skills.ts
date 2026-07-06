/**
 * claude-code/skills.ts — Claude Code skill file generator
 *
 * Generates .claude/skills/bp-<step>.md files for each workflow step.
 * Reuses WORKFLOW_REGISTRY template body content.
 * Parameters kept as $1/$ARGUMENTS (Claude Code native format).
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

export interface ClaudeSkillDef {
  step: string;
  name: string;
  description: string;
}

const STEPS = ['init', 'grill', 'research', 'roadmap', 'milestone', 'discuss', 'research-phase', 'split', 'adhoc', 'plan', 'apply', 'review', 'archive', 'proposal', 'ship', 'continue', 'audit', 'loop', 'config', 'commit', 'fix-plan', 'fix-apply'] as const;

function skillDescription(step: string): string {
  const map: Record<string, string> = {
    init: 'Initialize bp project structure and generate platform files',
    grill: 'Requirements exploration — detailed questioning until shared understanding',
    research: 'Project-level technical research — parallel multi-direction investigation',
    roadmap: 'Roadmap definition — split project into Milestones × Phases',
    milestone: 'Milestone management — switch/create milestones, set current phase',
    discuss: 'Phase discussion — capture implementation decisions into context.md',
    'research-phase': 'Phase research — implementation path investigation',
    split: 'Change splitting — dependency graph + N changes',
    adhoc: 'Create adhoc change — independent change unrelated to milestone/phase',
    plan: 'Change design — technical design + task breakdown + delta-specs',
    apply: 'Code implementation — TDD RED→GREEN→REFACTOR',
    review: 'Triple review — spec/quality/goal reviews in parallel',
    archive: 'Verify & archive — run checks, then delta-spec merge + directory move + state update',
    proposal: 'Fill change proposal — intent, scope, approach, must-haves, non-goals',
    ship: 'Ship — create PR + update state / release tag',
    continue: 'Auto-advance — read STATE and route to next step',
    audit: 'Human UAT verification — generate uat.md, interactive testing, create adhoc fixes',
    loop: 'Autonomous loop — auto-advance all steps, AI fills decisions without asking',
    config: 'Interactive configuration — set workflow, model, conventions, etc.',
    commit: 'Commit changes — conventional commits + hash recording to tasks.md',
    'fix-plan': 'Fix design — correct architecture/approach based on review BLOCKERs',
    'fix-apply': 'Fix implementation — wave-based dispatch for review finding fixes',
  };
  return map[step] ?? '';
}

export const SKILL_DEFS: ClaudeSkillDef[] = STEPS.map((step) => ({
  step,
  name: `bp:${step}`,
  description: skillDescription(step),
}));

export function generateClaudeSkill(def: ClaudeSkillDef): string {
  const entry = WORKFLOW_REGISTRY[def.step as WorkflowStep];
  const body = entry ? entry.command().content : `# ${def.description}\n\nWorkflow guide for the \`${def.step}\` step.`;
  return [
    '---',
    `name: ${def.name}`,
    `description: ${def.description}`,
    '---',
    '',
    body,
  ].join('\n');
}

export function generateClaudeSkills(_config: ProjectConfig): { path: string; content: string }[] {
  return SKILL_DEFS.map((def) => ({
    path: `.claude/skills/bp-${def.step}.md`,
    content: generateClaudeSkill(def),
  }));
}
