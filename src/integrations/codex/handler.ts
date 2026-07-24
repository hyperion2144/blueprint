/**
 * codex/handler.ts — Codex handler runtime helpers
 *
 * Exports the testable handler functions (isDisabled, hasBpConfig,
 * dispatchHandler, etc.) and `generateCodexHandler(config)` which emits
 * the byte-deterministic `.codex/hooks/bp-handler.mjs` descriptor sourced
 * from `HANDLER_SOURCE` in `src/templates/codex/handler.tmpl.ts`.
 *
 * The runtime helpers here and the inline JS inside HANDLER_SOURCE are
 * kept in lockstep by the T-4 RED/GREEN/REFACTOR cycle. When you change
 * one, port the change to the other.
 */

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import type { ProjectConfig } from '../../types/index.js';
import { HANDLER_SOURCE } from '../../templates/codex/handler.tmpl.js';

/** Path of the generated Codex handler script. */
export const CODEX_HANDLER_PATH = '.codex/hooks/bp-handler.mjs';

/** Static lookup: events that emit a bp-workflow-state payload. */
const WORKFLOW_STATE_EVENT_TABLE: Readonly<Record<string, true>> = {
  UserPromptSubmit: true,
  PreToolUse: true,
  PostToolUse: true,
};

/**
 * True when the user has explicitly disabled all bp hook handlers.
 * Mirrors the OMP Extension `isDisabled` predicate.
 */
export function isDisabled(): boolean {
  return process.env.BP_HOOKS === '0' || process.env.BP_DISABLE_HOOKS === '1';
}

/**
 * True when `bp/config.yaml` exists at the given cwd.
 */
export function hasBpConfig(cwd: string | undefined): boolean {
  if (!cwd) return false;
  return existsSync(join(cwd, 'bp', 'config.yaml'));
}

/**
 * Read `bp/state.md` and return its trimmed content.
 * Returns `_no state available_` on any failure (mirrors OMP behavior).
 */
function readBpState(cwd: string): string {
  try {
    const out = readFileSync(join(cwd, 'bp', 'state.md'), 'utf-8');
    return out.trim() || '_no state available_';
  } catch {
    return '_no state available_';
  }
}

/**
 * Generate the `<bp-context>...</bp-context>` markdown block for the
 * given cwd. Returns the empty tag pair when bp/config.yaml is missing
 * OR when the `bp context` subprocess fails for any reason (binary
 * absent, non-zero exit, malformed output).
 *
 * The `execBpContext` parameter is a DI seam: tests inject a mock that
 * returns a deterministic block; the generated runtime handler uses
 * the default which spawns the real `bp` binary. The default is inlined
 * because it has exactly one call site and the call shape (binary +
 * args + stdio) is documented here rather than at a one-line wrapper.
 */
export function generateContextBlock(
  cwd: string | undefined,
  execBpContext: (cwd: string) => string = (c) =>
    execFileSync('bp', ['context', 'apply', '--format=compact'], {
      cwd: c,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
): string {
  if (!cwd || !hasBpConfig(cwd)) {
    return '<bp-context>\n</bp-context>';
  }
  try {
    const out = execBpContext(cwd).trim();
    if (!out.startsWith('<bp-context>') || !out.endsWith('</bp-context>')) {
      return '<bp-context>\n</bp-context>';
    }
    return out;
  } catch {
    return '<bp-context>\n</bp-context>';
  }
}

/**
 * Read the active workflow state from `bp/state.md`. Falls back to a
 * deterministic placeholder when the file is missing or unreadable.
 */
export function generateWorkflowState(cwd: string | undefined): string {
  if (!cwd || !hasBpConfig(cwd)) {
    return '_no state available_';
  }
  return readBpState(cwd);
}

/** Discriminated result type for dispatchHandler. */
export type HandlerResult =
  | { kind: 'bypass' }
  | { kind: 'context'; payload: string }
  | { kind: 'state'; payload: string }
  | { kind: 'noop' };

/**
 * Dispatch a Codex hook event to the appropriate bp payload.
 *
 *   - SessionStart     -> { kind: 'context', payload }
 *   - UserPromptSubmit -> { kind: 'state',   payload }
 *   - PreToolUse       -> { kind: 'state',   payload }
 *   - PostToolUse      -> { kind: 'state',   payload }
 *   - SessionStop      -> { kind: 'noop' }
 *
 * Bypass cases (env disabled OR missing bp/config.yaml) return
 * `{ kind: 'bypass' }` so the handler can exit 0 without a payload.
 */
export function dispatchHandler(
  event: string,
  cwd: string | undefined,
  execBpContext?: (cwd: string) => string
): HandlerResult {
  if (isDisabled() || !hasBpConfig(cwd)) return { kind: 'bypass' };

  if (event === 'SessionStart') {
    return { kind: 'context', payload: generateContextBlock(cwd, execBpContext) };
  }
  if (WORKFLOW_STATE_EVENT_TABLE[event] === true) {
    return { kind: 'state', payload: generateWorkflowState(cwd) };
  }
  // SessionStop and unknown events: no-op success.
  return { kind: 'noop' };
}

/**
 * Generate the `.codex/hooks/bp-handler.mjs` file descriptor.
 * Content is sourced from `HANDLER_SOURCE` for byte-determinism.
 */
export function generateCodexHandler(_config: ProjectConfig): { path: string; content: string }[] {
  return [{ path: CODEX_HANDLER_PATH, content: HANDLER_SOURCE }];
}