/**
 * OMP integration — platform-specific generators for commands, skills, and agents.
 *
 * To add a new platform (e.g. Claude Code):
 * 1. Create src/integrations/<platform>/
 * 2. Implement commands.ts, skills.ts, agents.ts following the same interfaces
 * 3. Register in src/integrations/index.ts
 */

export { generateAllCommands, STEP_DEFS } from './commands.js';
export { generateAllAgents, AGENT_DEFS } from './agents.js';
export { generateAllSkills, SKILL_DEFS } from './skills.js';
