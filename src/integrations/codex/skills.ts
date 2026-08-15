/**
 * codex/skills.ts — Codex CLI Skills generator (re-export wrapper).
 *
 * Codex uses the Agent Skills standard at `.agents/skills/bp-<step>/SKILL.md`.
 * The shared `src/integrations/shared/agents-skills.ts` module owns the
 * canonical implementation; both the `codex` platform and the generic
 * `agent` platform consume it so the two outputs are byte-identical.
 *
 * Kept symbols (for backward compatibility with downstream callers and
 * tests):
 *   - `CODEX_SKILL_DEFS`  — the canonical sixteen Codex skill descriptors.
 *   - `generateCodexSkills` — returns the same `{ path, content }[]`
 *     shape as `generateAgentSkills`.
 */

import {
  AGENT_SKILL_DEFS,
  generateAgentSkills,
  type AgentSkillDef,
} from '../shared/agents-skills.js';

/** Codex-flavored alias of `AGENT_SKILL_DEFS` (identity-equal). */
export const CODEX_SKILL_DEFS: AgentSkillDef[] = AGENT_SKILL_DEFS;

/** Codex-flavored alias of `generateAgentSkills` (identity-equal). */
export const generateCodexSkills = generateAgentSkills;