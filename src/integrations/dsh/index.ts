/**
 * dsh/index.ts — DeepSeek Harness platform provider
 *
 * Registers `dsh` with PlatformRegistry. The provider surfaces two
 * capability groups:
 *
 *   - Skills: sixteen `.dsh/skills/bp-<step>/SKILL.md` files from the
 *     shared WORKFLOW_REGISTRY, rendered with kebab-case frontmatter
 *     names (`name: bp-<step>`) so DSH's skill discovery
 *     (`@deepseek-ai/dsh-skill-filesystem`, project root rank 100)
 *     accepts them.
 *   - Agents: seven `.dsh/agents/bp-<role>.md` sub-agent system-prompt
 *     files. DSH has no runtime agent-file discovery, so these are not
 *     loaded automatically — an orchestrator references them by path
 *     inside the `subagent` tool's `prompt` argument (see `agents.ts`).
 *
 * The provider id is `dsh`, display name `DeepSeek Harness`, and
 * `supportsCommands: false` (DSH uses Skills, not slash commands).
 */

import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generateDshSkills } from './skills.js';
import { generateDshAgents } from './agents.js';

const DSH_PROVIDER_ID = 'dsh';

export function registerDshProvider(): void {
  if (PlatformRegistry.has(DSH_PROVIDER_ID)) return;

  const provider: PlatformProvider = {
    id: DSH_PROVIDER_ID,
    name: 'DeepSeek Harness',
    capabilities: { supportsCommands: false },
    generate(config) {
      return [
        ...generateDshSkills(config),
        ...generateDshAgents(config),
      ];
    },
  };

  PlatformRegistry.register(DSH_PROVIDER_ID, provider);
}

export { generateDshSkills, DSH_SKILL_DEFS } from './skills.js';
export { generateDshAgents, DSH_AGENT_DEFS } from './agents.js';