/**
 * bp — generic `agent` platform Skills generator (re-export wrapper).
 *
 * The `.agents/skills/bp-<step>/SKILL.md` files are owned by the shared
 * `src/integrations/shared/agents-skills.ts` module, which is also
 * consumed by the `codex` platform. Both platforms emit identical bytes
 * at the same path — the file writer overwrites with identical content.
 *
 * Generic-platform semantics (`.agents/agents/bp-<role>.md` for sub-agent
 * definitions) live in `./agents.ts`.
 */

export {
  generateAgentSkills,
  AGENT_SKILL_DEFS,
  generateAgentSkill,
  type AgentSkillDef,
} from '../shared/agents-skills.js';