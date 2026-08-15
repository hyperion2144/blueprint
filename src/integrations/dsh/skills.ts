/**
 * dsh/skills.ts — DeepSeek Harness (DSH) Skills generator
 *
 * Generates `.dsh/skills/bp-<step>/SKILL.md` files for each workflow step.
 *
 * DSH's skill provider (`@deepseek-ai/dsh-skill-filesystem`) scans the
 * project-level `<git-root>/.dsh/skills` root (rank 100 — highest project
 * precedence) and validates the frontmatter `name` against the strict
 * kebab-case grammar `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`. The Agent Skills /
 * Codex colon convention (`name: bp:plan`) is REJECTED by that grammar,
 * so this platform renders hyphenated names (`name: bp-plan`).
 *
 * Step list and descriptions are shared with the `.agents/skills`
 * generator (`src/integrations/shared/agents-skills.ts`); only the name
 * rendering and the output root differ.
 */

import type { ProjectConfig } from '../../types/index.js';
import {
  AGENT_SKILL_DEFS,
  generateAgentSkill,
  type AgentSkillDef,
} from '../shared/agents-skills.js';

/**
 * Canonical sixteen DSH skill definitions — same steps and descriptions as
 * the shared `.agents/skills` set, but with kebab-case names (`bp-<step>`)
 * that pass DSH's skill-name grammar.
 */
export const DSH_SKILL_DEFS: AgentSkillDef[] = AGENT_SKILL_DEFS.map((def) => ({
  ...def,
  name: def.name.replace(':', '-'),
}));

/**
 * Generate all DSH skill files.
 * Path format: `.dsh/skills/bp-<step>/SKILL.md`
 * Frontmatter: `name: bp-<step>` (kebab-case, DSH-compatible), `description`,
 * no `argument-hint`, no `hide`.
 */
export function generateDshSkills(_config: ProjectConfig): { path: string; content: string }[] {
  return DSH_SKILL_DEFS.map((def) => ({
    path: `.dsh/skills/bp-${def.step}/SKILL.md`,
    content: generateAgentSkill(def),
  }));
}