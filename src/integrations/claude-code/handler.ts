/**
 * claude-code/handler.ts — Claude Code handler runtime helpers
 *
 * Exports the testable handler functions (isDisabled, hasBpConfig,
 * dispatchHandler, etc.) and `generateClaudeHandler(config)` which emits
 * the byte-deterministic `.claude/hooks/bp-claude-handler.mjs` descriptor.
 *
 * T-2 ships the runtime helpers + HANDLER_SOURCE inline so the descriptor
 * path is fully testable. T-3 moves HANDLER_SOURCE to
 * `src/templates/claude-code/handler.tmpl.ts` and switches this file to
 * re-export from the template (D-2: independent near-duplicate of Codex).
 *
 * The runtime helpers here and the inline JS inside HANDLER_SOURCE are
 * kept in lockstep by the T-2 RED/GREEN/REFACTOR cycle. When you change
 * one, port the change to the other.
 */

import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import type { ProjectConfig } from '../../types/index.js';

/** Path of the generated Claude Code handler script. */
export const CLAUDE_HANDLER_PATH = '.claude/hooks/bp-claude-handler.mjs';

/** Static lookup: events that emit a bp-workflow-state payload. */
const WORKFLOW_STATE_EVENT_TABLE: Readonly<Record<string, true>> = {
  UserPromptSubmit: true,
  PreToolUse: true,
  PostToolUse: true,
};

/**
 * True when the user has explicitly disabled all bp hook handlers.
 * Mirrors the Codex `isDisabled` predicate and the OMP Extension.
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
 * the default which spawns the real `bp` binary.
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
 * Dispatch a Claude Code hook event to the appropriate bp payload.
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
 * The full self-contained `.mjs` source for the generated Claude Code
 * handler script. Inline in T-2; T-3 moves it to
 * `src/templates/claude-code/handler.tmpl.ts` and re-exports from there.
 *
 * Byte-determinism: this constant MUST NOT include Date.now(),
 * Math.random(), or any environment lookups. Two reads are guaranteed
 * identical and two calls to generateClaudeHandler() with the same
 * config return identical content.
 *
 * Runtime contract:
 *   - BP_HOOKS=0 OR BP_DISABLE_HOOKS=1  -> exit 0 silently (bypass)
 *   - missing bp/config.yaml            -> exit 0 silently (bypass)
 *   - SessionStart                      -> emit <bp-context> payload
 *   - UserPromptSubmit                  -> emit bp-workflow-state payload
 *   - PreToolUse                        -> emit bp-workflow-state payload
 *   - PostToolUse                       -> emit bp-workflow-state payload
 *   - SessionStop                       -> no-op (exit 0)
 */
export const HANDLER_SOURCE = `#!/usr/bin/env node
// bp Claude Code handler - generated by bp update. Do not edit manually.
// Implements the bp runtime contract for Claude Code hooks.
//
// Event mapping (all dispatched with the event name as argv[2]):
//   SessionStart     -> <bp-context> block
//   UserPromptSubmit -> bp-workflow-state payload
//   PreToolUse       -> bp-workflow-state payload (matcher: Bash)
//   PostToolUse      -> bp-workflow-state payload (matcher: Bash)
//   SessionStop      -> no-op (exit 0)
//
// Bypass:
//   BP_HOOKS=0 or BP_DISABLE_HOOKS=1 -> exit 0 silently
//   missing bp/config.yaml           -> exit 0 silently

import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

function isDisabled() {
  return process.env.BP_HOOKS === "0" || process.env.BP_DISABLE_HOOKS === "1";
}

function hasBpConfig(cwd) {
  if (!cwd) return false;
  return existsSync(join(cwd, "bp", "config.yaml"));
}

function readBpState(cwd) {
  try {
    var out = readFileSync(join(cwd, "bp", "state.md"), "utf-8");
    return out.trim() || "_no state available_";
  } catch {
    return "_no state available_";
  }
}

function generateContextBlock(cwd) {
  if (!cwd || !hasBpConfig(cwd)) {
    return "<bp-context>\\n</bp-context>";
  }
  try {
    var out = execFileSync("bp", ["context", "apply", "--format=compact"], {
      cwd: cwd,
      encoding: "utf-8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (out.indexOf("<bp-context>") !== 0 || out.lastIndexOf("</bp-context>") !== out.length - "</bp-context>".length) {
      return "<bp-context>\\n</bp-context>";
    }
    return out;
  } catch {
    return "<bp-context>\\n</bp-context>";
  }
}

function generateWorkflowState(cwd) {
  return readBpState(cwd);
}

function bypass() {
  return { continue: true };
}

function contextPayload(block) {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: "SessionStart",
      additionalContext: block,
    },
  };
}

function statePayload(event, state) {
  return {
    continue: true,
    hookSpecificOutput: {
      hookEventName: event,
      additionalContext: state,
    },
  };
}

function dispatch(event, cwd) {
  if (event === "SessionStart") {
    return contextPayload(generateContextBlock(cwd));
  }
  if (event === "UserPromptSubmit" || event === "PreToolUse" || event === "PostToolUse") {
    return statePayload(event, generateWorkflowState(cwd));
  }
  return bypass();
}

var event = process.argv[2] || "";
var cwd = process.cwd();

if (isDisabled() || !hasBpConfig(cwd)) {
  process.stdout.write(JSON.stringify(bypass()) + "\\n");
} else {
  process.stdout.write(JSON.stringify(dispatch(event, cwd)) + "\\n");
}
`;

/**
 * Generate the `.claude/hooks/bp-claude-handler.mjs` file descriptor.
 * Content is sourced from `HANDLER_SOURCE` for byte-determinism.
 */
export function generateClaudeHandler(_config: ProjectConfig): { path: string; content: string }[] {
  return [{ path: CLAUDE_HANDLER_PATH, content: HANDLER_SOURCE }];
}