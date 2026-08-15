/**
 * shared/agents-skills.ts — shared `.agents/skills/` generator.
 *
 * Single source of truth for project-scoped Skills at the
 * `.agents/skills/bp-<step>/SKILL.md` path, used by BOTH the generic
 * `agent` platform and the `codex` CLI platform. Two platforms emitting
 * identical bytes at the same path is harmless — the file writer
 * overwrites with identical content — so the merge produces a single
 * canonical skill set without registry-level deduplication.
 *
 * Frontmatter: `name: bp:<step>` (colon slash-command), `description`,
 * no `argument-hint`, no `hide` — the Agent Skills standard.
 */

import type { ProjectConfig } from '../../types/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../../templates/workflows/registry.js';

export interface AgentSkillDef {
  step: WorkflowStep;
  /** Slash-command name with colon, e.g. `bp:plan` */
  name: string;
  /** One-line description for skill discovery */
  description: string;
}

/** Canonical sixteen workflow steps, mirrored from WORKFLOW_REGISTRY keys. */
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

/** Description per step (Agent Skills standard; shared between agent + codex). */
function agentSkillDescription(step: WorkflowStep): string {
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

/** Canonical sixteen agent Skills definitions (immutable order). */
export const AGENT_SKILL_DEFS: AgentSkillDef[] = STEPS.map((step) => ({
  step,
  name: `bp:${step}`,
  description: agentSkillDescription(step),
}));

/**
 * Render a single agent Skill — frontmatter + body.
 * The frontmatter uses the Agent Skills convention (colon name, no `argument-hint`, no `hide`).
 * The body is sourced from `WORKFLOW_REGISTRY` with a deterministic fallback.
 */
export function generateAgentSkill(def: AgentSkillDef): string {
  const entry = WORKFLOW_REGISTRY[def.step];
  const body = entry ? entry.skill().instructions : `# bp-${def.step}\n\nWorkflow guide.`;
  return [
    '---',
    `name: ${def.name}`,
    `description: ${def.description}`,
    '---',
    '',
    body,
  ].join('\n');
}

/**
 * Generate all agent Skill files.
 * Path format: `.agents/skills/bp-<step>/SKILL.md`
 */
export function generateAgentSkills(_config: ProjectConfig): { path: string; content: string }[] {
  return AGENT_SKILL_DEFS.map((def) => ({
    path: `.agents/skills/bp-${def.step}/SKILL.md`,
    content: generateAgentSkill(def),
  }));
}