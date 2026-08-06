/**
 * codex/hooks.ts — OpenAI Codex CLI hooks.json generator
 *
 * Generates `.codex/hooks.json` describing the five Codex hook events
 * (SessionStart, SessionStop, UserPromptSubmit, PreToolUse, PostToolUse)
 * wired to a single byte-deterministic handler script. `SessionStop` is
 * valid for Codex (unlike Claude Code, which uses `SessionEnd`).
 *
 * Schema (Codex v0.140+):
 *   {
 *     "hooks": {
 *       "<EventName>": [
 *         { "matcher"?: "<tool>", "hooks": [{ "type": "command", "command": "<cmd>" }] }
 *       ]
 *     }
 *   }
 *
 * The descriptor carries a `merge` callback: hooks.json is shared with
 * user-owned hooks, so existing files are merged item-by-item instead of
 * overwritten (see `src/core/config-merge.ts`).
 */

import type { ProjectConfig } from '../../types/index.js';
import { isCommandHookGroup, mergeHookConfig } from '../../core/config-merge.js';

/** Codex hook event names this generator emits (deterministic order). */
export const CODEX_HOOK_EVENTS = [
  'SessionStart',
  'SessionStop',
  'UserPromptSubmit',
  'PreToolUse',
  'PostToolUse',
] as const;

export type CodexHookEvent = (typeof CODEX_HOOK_EVENTS)[number];

/** Path of the generated handler script invoked by every hook command. */
export const CODEX_HANDLER_REL_PATH = '.codex/hooks/bp-handler.mjs';

/** Path of the generated hooks configuration file. */
export const CODEX_HOOKS_PATH = '.codex/hooks.json';

/** Marker embedded in bp-generated hook commands; identifies bp-owned groups during merge. */
export const CODEX_HANDLER_MARKER = 'bp-handler.mjs';

/** True when a hook group's command targets the bp Codex handler. */
export function isCodexBpHookGroup(group: Record<string, unknown>): boolean {
  return isCommandHookGroup(CODEX_HANDLER_MARKER)(group);
}

interface CodexHookEntry {
  type: 'command';
  command: string;
}

interface CodexHookGroup {
  /** Tool name matcher; present only on PreToolUse / PostToolUse. */
  matcher?: 'Bash';
  hooks: CodexHookEntry[];
}

export interface CodexHookConfig {
  hooks: Record<CodexHookEvent, CodexHookGroup[]>;
}

/** Build the matcher for a given event — `Bash` for tool events, omitted otherwise. */
function matcherFor(evt: CodexHookEvent): 'Bash' | undefined {
  return evt === 'PreToolUse' || evt === 'PostToolUse' ? 'Bash' : undefined;
}

/**
 * Build the Codex hooks.json document for the given event set.
 * Each event group points at the single shared handler script with the
 * event name as its only argument.
 */
export function buildCodexHookConfig(events: readonly CodexHookEvent[] = CODEX_HOOK_EVENTS): CodexHookConfig {
  const hooks = {} as CodexHookConfig['hooks'];
  for (const evt of events) {
    const group: CodexHookGroup = {
      hooks: [
        {
          type: 'command',
          command: `node ${CODEX_HANDLER_REL_PATH} ${evt}`,
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
 * Render hooks.json to a deterministic string. Two-space JSON indent keeps
 * the output stable across runs and easy to diff. A trailing newline matches
 * POSIX text-file conventions.
 */
export function renderCodexHooksJson(config: unknown): string {
  return JSON.stringify(config, null, 2) + '\n';
}

/**
 * Merge freshly generated bp hooks into an existing hooks.json, keeping
 * user-owned hook groups. Throws on unparseable JSON so the writer falls
 * back to a backup + regenerate.
 */
function mergeCodexHooks(existingContent: string): string {
  const existing = JSON.parse(existingContent) as unknown;
  const merged = mergeHookConfig(existing, buildCodexHookConfig(), isCodexBpHookGroup);
  return renderCodexHooksJson(merged);
}

/**
 * Generate the `.codex/hooks.json` file descriptor.
 */
export function generateCodexHooks(
  _config: ProjectConfig
): { path: string; content: string; merge: (existingContent: string) => string }[] {
  return [
    {
      path: CODEX_HOOKS_PATH,
      content: renderCodexHooksJson(buildCodexHookConfig()),
      merge: mergeCodexHooks,
    },
  ];
}