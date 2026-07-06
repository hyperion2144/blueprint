/**
 * claude-code/index.ts — Claude Code platform provider
 */

import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generateClaudeSkills } from './skills.js';
import { generateClaudeAgents } from './agents.js';

export function registerClaudeCodeProvider(): void {
  if (PlatformRegistry.has('claude-code')) return;

  const provider: PlatformProvider = {
    id: 'claude-code',
    name: 'Claude Code Platform',
    capabilities: { supportsCommands: false },
    generate(config) {
      return [
        ...generateClaudeSkills(config),
        ...generateClaudeAgents(config),
      ];
    },
  };

  PlatformRegistry.register('claude-code', provider);
}
