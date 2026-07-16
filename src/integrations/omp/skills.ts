/**
 * Skills generator
 * Generates .omp/skills/bp-<step>/SKILL.md files (16 skill workflow guides).
 *
 * Each skill is a workflow guide loaded by agents via read skill://bp-<step>.
 * Templates are imported from TypeScript modules — same content source as commands.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

export interface SkillDef {
  /** Step identifier, consistent with command steps */
  step: string;
  /** Skill name */
  name: string;
  /** One-line description */
  description: string;
}

function skillName(step: string): string {
  return `bp-${step}`;
}

function skillDescription(step: string): string {
  const map: Record<string, string> = {
    init: 'Initialize blueprint project structure and generate platform files',
    roadmap: 'View or modify roadmap.md',
    propose: 'Create a change folder with proposal.md',
    plan: 'Dispatch planner sub-agent (produce design, tasks, delta specs)',
    apply: 'Dispatch executor sub-agents (implement tasks per wave)',
    review: 'Triple review of a change - outputs dispatch instructions',
    archive: 'Archive a change (merge delta specs, archive dir, update roadmap)',
    continue: 'Check progress and suggest next step',
    ff: 'Fast-forward: auto-advance through all steps by running bp continue after each',
    loop: 'Autonomous loop: same as ff but skip all user interaction until roadmap complete',
  };
  return map[step] ?? '';
}
const STEPS = ['init', 'roadmap', 'propose', 'plan', 'apply', 'review', 'archive', 'continue', 'ff', 'loop'] as const;

export const SKILL_DEFS: SkillDef[] = STEPS.map((step) => ({
  step,
  name: skillName(step),
  description: skillDescription(step),
}));

/**
 * Generate a single skill file — frontmatter + body.
 * Body comes from the TypeScript template (same as command content).
 */
export function generateSkill(def: SkillDef): string {
  const entry = WORKFLOW_REGISTRY[def.step as WorkflowStep];
  const body = entry ? entry.skill().instructions : `# ${def.description}\n\nWorkflow guide for the \`${def.step}\` step.`;
  return `---
name: ${def.name}
description: ${def.description}
hide: false
---

${body}
`;
}

/**
 * Generate all skill files.
 * Returns { path, content }[], path format: .omp/skills/bp-<step>/SKILL.md
 */
export function generateAllSkills(_config: ProjectConfig): { path: string; content: string }[] {
  return SKILL_DEFS.map((def) => ({
    path: `.omp/skills/bp-${def.step}/SKILL.md`,
    content: generateSkill(def),
  }));
}
