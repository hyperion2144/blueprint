/**
 * pi/index.ts — Pi Coding Agent platform provider
 *
 * Registers `pi` with PlatformRegistry. The provider surfaces these
 * capability groups:
 *
 *   - Skills  (T-1): eleven `.pi/skills/bp-<step>/SKILL.md` files from
 *                    the shared WORKFLOW_REGISTRY.
 *   - Agents  (T-2): six `.pi/agents/bp-<role>.md` sub-agent definitions
 *                    from AGENT_PROMPTS.
 *   - Extension (T-6): `.pi/extensions/bp/index.ts` — the pi extension
 *                    (context handlers + bp_subagent tool) from the
 *                    byte-deterministic EXTENSION_SOURCE template.
 *
 * The provider id is `pi`, display name `Pi Coding Agent`, and
 * `supportsCommands: false` (pi uses Agent Skills, not slash commands).
 */

import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generatePiSkills } from './skills.js';
import { generatePiAgents } from './agents.js';
import { generatePiExtension } from './extension.js';

const PI_PROVIDER_ID = 'pi';

export function registerPiProvider(): void {
  if (PlatformRegistry.has(PI_PROVIDER_ID)) return;

  const provider: PlatformProvider = {
    id: PI_PROVIDER_ID,
    name: 'Pi Coding Agent',
    capabilities: { supportsCommands: false },
    generate(config) {
      return [
        ...generatePiSkills(config),
        ...generatePiAgents(config),
        ...generatePiExtension(config),
      ];
    },
  };

  PlatformRegistry.register(PI_PROVIDER_ID, provider);
}

export { generatePiSkills, PI_SKILL_DEFS } from './skills.js';
export { generatePiAgents, PI_AGENT_DEFS } from './agents.js';
export { generatePiExtension, PI_EXTENSION_PATH } from './extension.js';
