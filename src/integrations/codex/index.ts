/**
 * codex/index.ts — OpenAI Codex CLI platform provider
 *
 * Registers `codex` with PlatformRegistry. The provider surfaces these
 * capability groups:
 *
 *   - Skills  (T-1): ten `.agents/skills/bp-<step>/SKILL.md` files from
 *                    the shared WORKFLOW_REGISTRY.
 *   - Hooks   (T-3): `.codex/hooks.json` wiring the five Codex lifecycle
 *                    events to the shared handler script.
 *   - Handler (T-4): `.codex/hooks/bp-handler.mjs` — byte-deterministic
 *                    runtime that emits bp-context / bp-workflow-state
 *                    payloads per Codex event.
 *
 * The provider id is `codex`, display name `OpenAI Codex CLI`, and
 * `supportsCommands: false` (Codex uses Skills, not slash commands).
 */

import type { PlatformProvider } from '../../core/platform-registry.js';
import { PlatformRegistry } from '../../core/platform-registry.js';
import { generateCodexSkills } from './skills.js';
import { generateCodexHooks } from './hooks.js';
import { generateCodexHandler } from './handler.js';

const CODEX_PROVIDER_ID = 'codex';

export function registerCodexProvider(): void {
  if (PlatformRegistry.has(CODEX_PROVIDER_ID)) return;

  const provider: PlatformProvider = {
    id: CODEX_PROVIDER_ID,
    name: 'OpenAI Codex CLI',
    capabilities: { supportsCommands: false },
    generate(config) {
      return [
        ...generateCodexSkills(config),
        ...generateCodexHooks(config),
        ...generateCodexHandler(config),
      ];
    },
  };

  PlatformRegistry.register(CODEX_PROVIDER_ID, provider);
}

export { generateCodexSkills, CODEX_SKILL_DEFS } from './skills.js';
export {
  generateCodexHooks,
  buildCodexHookConfig,
  CODEX_HOOK_EVENTS,
  CODEX_HOOKS_PATH,
  CODEX_HANDLER_REL_PATH,
} from './hooks.js';
export {
  generateCodexHandler,
  dispatchHandler,
  isDisabled as isCodexHooksDisabled,
  hasBpConfig as hasCodexBpConfig,
  CODEX_HANDLER_PATH,
} from './handler.js';