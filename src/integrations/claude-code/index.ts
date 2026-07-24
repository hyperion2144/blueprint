/**
 * claude-code/index.ts — Claude Code platform provider
 *
 * Registers `claude-code` with PlatformRegistry. The provider surfaces
 * these capability groups:
 *
 *   - Commands (existing): `.claude/commands/<name>.md` files from
 *                          Claude Code slash-command definitions.
 *   - Agents   (existing): `.claude/agents/<name>.md` files.
 *   - Hooks    (DS-1):     `.claude/settings.json` wiring the five
 *                          Claude lifecycle events to the shared
 *                          handler script.
 *   - Handler  (DS-2):     `.claude/hooks/bp-claude-handler.mjs` —
 *                          byte-deterministic runtime that emits
 *                          bp-context / bp-workflow-state payloads
 *                          per Claude Code event.
 *
 * The provider id is `claude-code`, display name `Claude Code Platform`,
 * and `supportsCommands: true`.
 */

import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generateClaudeCommands } from './commands.js';
import { generateClaudeAgents } from './agents.js';
import { generateClaudeHooks } from './hooks.js';
import { generateClaudeHandler } from './handler.js';

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
        ...generateClaudeHooks(config),
        ...generateClaudeHandler(config),
      ];
    },
  };

  PlatformRegistry.register('claude-code', provider);
}

export { generateClaudeCommands } from './commands.js';
export { generateClaudeAgents } from './agents.js';
export {
  generateClaudeHooks,
  buildClaudeHookConfig,
  CLAUDE_HOOK_EVENTS,
  CLAUDE_HOOKS_PATH,
  CLAUDE_HANDLER_REL_PATH,
} from './hooks.js';
export {
  generateClaudeHandler,
  dispatchHandler,
  isDisabled as isClaudeHooksDisabled,
  hasBpConfig as hasClaudeBpConfig,
  CLAUDE_HANDLER_PATH,
} from './handler.js';