/**
 * claude-code/hooks.ts — Claude Code settings.json hook generator
 *
 * Generates `.claude/settings.json` describing the five Claude Code hook
 * events (SessionStart, SessionStop, UserPromptSubmit, PreToolUse,
 * PostToolUse) wired to a single byte-deterministic handler script.
 *
 * Schema (Claude Code):
 *   {
 *     "hooks": {
 *       "<EventName>": [
 *         { "matcher"?: "<tool>", "hooks": [{ "type": "command", "command": "<cmd>" }] }
 *       ]
 *     }
 *   }
 */

import type { ProjectConfig } from '../../types/index.js';

/** Claude Code hook event names this generator emits (deterministic order). */
export const CLAUDE_HOOK_EVENTS = [
  'SessionStart',
  'SessionStop',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
] as const;

export type ClaudeHookEvent = (typeof CLAUDE_HOOK_EVENTS)[number];

/** Path of the generated handler script invoked by every hook command. */
export const CLAUDE_HANDLER_REL_PATH = '.claude/hooks/bp-claude-handler.mjs';

/** Path of the generated settings.json hook configuration file. */
export const CLAUDE_HOOKS_PATH = '.claude/settings.json';

interface ClaudeHookEntry {
  type: 'command';
  command: string;
}

interface ClaudeHookGroup {
  /** Tool name matcher; present only on PreToolUse / PostToolUse. */
  matcher?: 'Bash';
  hooks: ClaudeHookEntry[];
}

export interface ClaudeHookConfig {
  hooks: Record<ClaudeHookEvent, ClaudeHookGroup[]>;
}

/** Build the matcher for a given event — `Bash` for tool events, omitted otherwise. */
function matcherFor(evt: ClaudeHookEvent): 'Bash' | undefined {
  return evt === 'PreToolUse' || evt === 'PostToolUse' ? 'Bash' : undefined;
}

/**
 * Build the Claude Code settings.json document for the given event set.
 * Each event group points at the single shared handler script with the
 * event name as its only argument.
 */
export function buildClaudeHookConfig(
  events: readonly ClaudeHookEvent[] = CLAUDE_HOOK_EVENTS
): ClaudeHookConfig {
  const hooks = {} as ClaudeHookConfig['hooks'];
  for (const evt of events) {
    const group: ClaudeHookGroup = {
      hooks: [
        {
          type: 'command',
          command: `node ${CLAUDE_HANDLER_REL_PATH} ${evt}`,
        },
      ],
    };
    const matcher = matcherFor(evt);
    if (matcher) group.matcher = matcher;
    hooks[evt] = [group];
  }
  return { hooks };
}

/**
 * Render settings.json to a deterministic string. Two-space JSON indent
 * keeps the output stable across runs and easy to diff. A trailing
 * newline matches POSIX text-file conventions.
 */
export function renderClaudeHooksJson(config: ClaudeHookConfig): string {
  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * Generate the `.claude/settings.json` file descriptor.
 */
export function generateClaudeHooks(_config: ProjectConfig): { path: string; content: string }[] {
  return [
    {
      path: CLAUDE_HOOKS_PATH,
      content: renderClaudeHooksJson(buildClaudeHookConfig()),
    },
  ];
}