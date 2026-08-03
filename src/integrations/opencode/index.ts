/**
 * opencode/index.ts - OpenCode platform provider
 *
 * Registers `opencode` with PlatformRegistry. The provider surfaces:
 *   - Commands: `.opencode/commands/bp-<step>.md` slash-command definitions.
 *   - Agents:   `.opencode/agents/bp-<role>.md` subagent definitions.
 *
 * OpenCode uses the same `.opencode/` directory convention with plural
 * subdirectories (`commands/`, `agents/`), similar to Claude Code.
 *
 * The provider id is `opencode`, display name `OpenCode`,
 * and `supportsCommands: true`.
 */

import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generateOpenCodeCommands } from './commands.js';
import { generateOpenCodeAgents } from './agents.js';

export function registerOpenCodeProvider(): void {
  if (PlatformRegistry.has('opencode')) return;

  const provider: PlatformProvider = {
    id: 'opencode',
    name: 'OpenCode',
    capabilities: { supportsCommands: true },
    generate(config) {
      return [
        ...generateOpenCodeCommands(config),
        ...generateOpenCodeAgents(config),
      ];
    },
  };

  PlatformRegistry.register('opencode', provider);
}

export { generateOpenCodeCommands } from './commands.js';
export { generateOpenCodeAgents } from './agents.js';
