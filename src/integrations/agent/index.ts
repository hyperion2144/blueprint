import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generateAgentSkills } from './skills.js';
import { generateAgentAgents } from './agents.js';

export function registerAgentProvider(): void {
  if (PlatformRegistry.has('agent')) return;
  const provider: PlatformProvider = {
    id: 'agent',
    name: 'Agent Platform',
    capabilities: { supportsCommands: false },
    generate(config) {
      return [
        ...generateAgentSkills(config),
        ...generateAgentAgents(config),
      ];
    },
  };
  PlatformRegistry.register('agent', provider);
}
