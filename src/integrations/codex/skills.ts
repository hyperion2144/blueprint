/**
 * codex/skills.ts — OpenAI Codex CLI Skills generator
 *
 * Generates .agents/skills/bp-<step>/SKILL.md files for each workflow step.
 * Codex Skills use colon slash-command names (bp:<step>) and frontmatter
 * with only `name` and `description` — no `argument-hint` or `hide` fields.
 *
 * Workflow bodies are sourced from the shared WORKFLOW_REGISTRY so the
 * Codex Skills stay in lockstep with OMP and Claude Code instructions.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

export interface CodexSkillDef {
  step: WorkflowStep;
  /** Codex slash-command name with colon, e.g. `bp:plan` */
  name: string;
  /** One-line description for Codex Skill discovery */
  description: string;
}

/** Canonical ten Codex Skill steps, mirrored from WORKFLOW_REGISTRY keys. */
const STEPS: readonly WorkflowStep[] = [
  'init',
  'roadmap',
  'propose',
  'plan',
  'apply',
  'review',
  'archive',
  'continue',
  'ff',
  'loop',
];

/** Description per step (Codex-tuned wording; differs from OMP/Claude variants). */
function codexSkillDescription(step: WorkflowStep): string {
  const map: Record<WorkflowStep, string> = {
    init: 'Initialize blueprint project structure and generate platform files',
    roadmap: 'View or modify roadmap.md',
    propose: 'Create a change folder with proposal.md',
    plan: 'Dispatch planner sub-agent (produce design, tasks, delta specs)',
    apply: 'Dispatch executor sub-agents (implement tasks per wave)',
    review: 'Triple review of a change - outputs dispatch instructions',
    archive: 'Archive a change (merge delta specs, archive dir, update roadmap)',
    continue: 'Check progress and suggest next step',
    ff: 'Fast-forward: auto-advance through all steps by calling bp continue after each',
    loop: 'Autonomous loop: same as ff but skip all user interaction until roadmap complete',
  };
  return map[step];
}

/** Canonical ten Codex Skill definitions (immutable order). */
export const CODEX_SKILL_DEFS: CodexSkillDef[] = STEPS.map((step) => ({
  step,
  name: `bp:${step}`,
  description: codexSkillDescription(step),
}));

/**
 * Render a single Codex Skill — frontmatter + body.
 * The frontmatter uses Codex conventions (colon name, no `argument-hint`).
 * The body is sourced from `WORKFLOW_REGISTRY` with a deterministic fallback.
 */
export function generateCodexSkill(def: CodexSkillDef): string {
  const entry = WORKFLOW_REGISTRY[def.step];
  const body = entry ? entry.skill().instructions : `# bp-${def.step}\n\nWorkflow guide.`;
  const lines = [
    '---',
    `name: ${def.name}`,
    `description: ${def.description}`,
    '---',
    '',
    body,
  ];
  return lines.join('\n');
}

/**
 * Generate all Codex Skill files.
 * Path format: `.agents/skills/bp-<step>/SKILL.md`
 */
export function generateCodexSkills(_config: ProjectConfig): { path: string; content: string }[] {
  return CODEX_SKILL_DEFS.map((def) => ({
    path: `.agents/skills/bp-${def.step}/SKILL.md`,
    content: generateCodexSkill(def),
  }));
}