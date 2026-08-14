/**
 * pi/skills.ts — Pi Coding Agent skills generator
 *
 * Generates .pi/skills/bp-<step>/SKILL.md files for each workflow step.
 * Pi implements the Agent Skills standard: directories containing a
 * SKILL.md are discovered recursively, and colon slash-command names
 * (bp:<step>) are the Agent Skills naming convention.
 *
 * Workflow bodies are sourced from the shared WORKFLOW_REGISTRY so the
 * pi skills stay in lockstep with OMP, Claude Code, and Codex instructions.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

export interface PiSkillDef {
  step: WorkflowStep;
  /** Agent Skills slash-command name with colon, e.g. `bp:plan` */
  name: string;
  /** One-line description for pi skill discovery */
  description: string;
}

/** Canonical sixteen pi workflow steps, mirrored from WORKFLOW_REGISTRY keys. */
const STEPS: readonly WorkflowStep[] = [
  'init',
  'roadmap',
  'propose',
  'plan',
  'apply',
  'check',
  'archive',
  'continue',
  'ff',
  'loop',
  'refactor',
  'design',
  'design-html',
  'design-review',
  'design-shotgun',
  'plan-design-review',
];

/** Description per step (mirrors the Codex wording — pi shares the Agent Skills standard). */
function piSkillDescription(step: WorkflowStep): string {
  const map: Record<WorkflowStep, string> = {
    init: 'Initialize blueprint project structure and generate platform files',
    roadmap: 'View or modify roadmap.md',
    propose: 'Create a change folder with proposal.md',
    plan: 'Dispatch planner sub-agent (produce design, tasks, delta specs)',
    apply: 'Dispatch executor sub-agents (implement tasks per wave)',
    check: 'Triple check of a change - full verify + fixer loopback + full re-review',
    archive: 'Archive a change (merge delta specs, archive dir, update roadmap)',
    continue: 'Check progress and suggest next step',
    ff: 'Fast-forward - auto-advance through all steps by calling bp continue after each',
    loop: 'Autonomous loop - same as ff but skip all user interaction until roadmap complete',
    refactor: 'Run deterministic refactor analyzer and dispatch refactorer sub-agents per module',
    design: 'Design system consultation - complete design proposal written to root DESIGN.md',
    'design-html': 'Design to production HTML/CSS - implement DESIGN.md against the detected project framework',
    'design-review': "Designer's-eye QA audit - full visual and UX audit against DESIGN.md",
    'design-shotgun': 'Multi-variant design exploration - generate, compare, and approve design variants',
    'plan-design-review': 'Plan-phase UI audit - UI scope detection and 0-10 rating before implementation',
  };
  return map[step];
}

/** Canonical sixteen pi skill definitions (immutable order). */
export const PI_SKILL_DEFS: PiSkillDef[] = STEPS.map((step) => ({
  step,
  name: `bp:${step}`,
  description: piSkillDescription(step),
}));

/**
 * Render a single pi skill — frontmatter + body.
 * The frontmatter uses the Agent Skills convention (colon name, no `argument-hint`).
 * The body is sourced from `WORKFLOW_REGISTRY` with a deterministic fallback.
 */
export function generatePiSkill(def: PiSkillDef): string {
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
 * Generate all pi skill files.
 * Path format: `.pi/skills/bp-<step>/SKILL.md`
 */
export function generatePiSkills(_config: ProjectConfig): { path: string; content: string }[] {
  return PI_SKILL_DEFS.map((def) => ({
    path: `.pi/skills/bp-${def.step}/SKILL.md`,
    content: generatePiSkill(def),
  }));
}
