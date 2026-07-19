/**
 * OMP integration — platform-specific generators for commands, skills,
 * agents, and the OMP Extension.
 *
 * To add a new platform (e.g. Claude Code):
 * 1. Create src/integrations/<platform>/
 * 2. Implement commands.ts, skills.ts, agents.ts following the same interfaces
 * 3. Register in src/integrations/index.ts
 */

import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generateAllCommands } from './commands.js';
import { generateAllAgents } from './agents.js';
import { generateAllSkills } from './skills.js';
import { generateExtension } from './extension.js';
import { generateLegacyShim } from './legacy-shim.js';

/** OMP supports slash commands — skills are redundant (same content source). */
export const supportsCommands = true;

/** Register OMP as a PlatformProvider. Idempotent — no-op if already registered. */
export function registerOmpProvider(): void {
  if (PlatformRegistry.has('omp')) return;

  const provider: PlatformProvider = {
    id: 'omp',
    name: 'OMP (Oh My Pi)',
    capabilities: { supportsCommands: true },
    generate(config) {
      const files = [
        ...generateAllCommands(config),
        ...generateAllAgents(config),
        ...generateExtension(config),
        ...generateLegacyShim(config),
      ];
      if (!supportsCommands) {
        files.push(...generateAllSkills(config));
      }
      return files;
    },
  };

  PlatformRegistry.register('omp', provider);
}

export { generateAllCommands, STEP_DEFS } from './commands.js';
export { generateAllAgents, AGENT_DEFS } from './agents.js';
export { generateAllSkills, SKILL_DEFS } from './skills.js';
export { generateExtension, EXTENSION_PATH } from './extension.js';
export { generateLegacyShim, LEGACY_SHIM_PATH } from './legacy-shim.js';
export { EXTENSION_SOURCE, SHIM_SOURCE } from './extension-runtime.js';
