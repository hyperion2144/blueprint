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
    init: 'Initialize bp project structure, generate platform files',
    grill: 'Requirements exploration — detailed questioning until shared understanding is reached',
    research: 'Project-level technical research — parallel multi-direction investigation',
    roadmap: 'Roadmap definition — split project into Milestones × Phases',
    milestone: 'Milestone management — switch/create milestones, set current phase',
    discuss: 'Phase discussion — capture implementation decisions into context.md',
    'research-phase': 'Phase research — implementation path investigation',
    split: 'Change splitting — dependency graph + N changes',
    adhoc: 'Create adhoc change — independent change unrelated to milestone/phase',
    plan: 'Change design — technical design + task breakdown + delta-specs',
    apply: 'Code implementation — TDD RED→GREEN→REFACTOR',
    review: 'Triple review — spec review, quality review, goal review in parallel',
    archive: 'Verify & archive — run checks, then delta-spec merge + directory move + state update',
    ship: 'Ship — create PR + update state / release tag',
    continue: 'Auto-advance — read STATE and route to next step',
    audit: 'Human UAT verification — generate uat.md, interactive testing, create adhoc fixes',
    loop: 'Autonomous loop — auto-advance all steps, AI fills decisions without asking',
    commit: 'Commit changes — conventional commits + hash recording to tasks.md',
    proposal: 'Fill change proposal — intent, scope, approach, must-haves, non-goals',
  };
  return map[step] ?? '';
}

const STEPS = ['init', 'grill', 'research', 'roadmap', 'milestone', 'discuss', 'research-phase', 'split', 'adhoc', 'plan', 'apply', 'review', 'archive', 'proposal', 'ship', 'continue', 'audit', 'loop', 'commit'] as const;

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
