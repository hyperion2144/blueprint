/**
 * claude-code/index.ts — Claude Code platform provider
 */

import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generateClaudeCommands } from './commands.js';
import { generateClaudeAgents } from './agents.js';

export function registerClaudeCodeProvider(): void {
  if (PlatformRegistry.has('claude-code')) return;

  const provider: PlatformProvider = {
    id: 'claude-code',
    name: 'Claude Code Platform',
    capabilities: { supportsCommands: true },
    generate(config) {
      return [
        ...generateClaudeCommands(config),
        ...generateClaudeAgents(config),
      ];
    },
  };

  PlatformRegistry.register('claude-code', provider);
}
