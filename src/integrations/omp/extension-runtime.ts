/**
 * OMP Extension runtime — the source-of-truth module for the OMP Extension
 * (PR-4). Re-exports the bundled string constants from `src/templates/omp/`
 * and provides TypeScript handler helpers that the integration test
 * exercises directly. The handlers inlined inside `EXTENSION_SOURCE` and
 * the exported helpers here are kept in lockstep by the T-26..T-37
 * behavior tasks; the snapshot test (T-38) pins the bundled source.
 */

import { EXTENSION_SOURCE } from '../../templates/omp/extension.tmpl.js';
import { SHIM_SOURCE } from '../../templates/omp/legacy-shim.tmpl.js';

export { EXTENSION_SOURCE, SHIM_SOURCE };

/** Content block the OMP API expects in `sendMessage` and `context.message`. */
export interface BpTextBlock {
  type: 'text';
  text: string;
}

/** Shape of a custom OMP message. */
export interface BpMessage {
  role: 'custom';
  customType: string;
  content: BpTextBlock[];
  timestamp: number;
}

/** Per-event context the OMP runtime hands to handlers. */
export interface ExtensionContext {
  cwd?: string;
  ui?: { setStatus?: (label: string, value: string) => void };
  agentTemplate?: string;
  recentMessages?: Array<{ customType?: string; role?: string; timestamp?: number }>;
  lastCompactionTs?: number;
  lastInjectionTs?: number;
  /** Optional active change name (resolved by the Extension from bp/state). */
  activeChangeName?: string;
}

/** OMP Extension API surface used by the handlers. */
export interface ExtensionAPI {
  on(
    event: string,
    handler: (event: unknown, ctx: ExtensionContext) => unknown | Promise<unknown>,
  ): void;
  sendMessage(msg: BpMessage, opts?: unknown): void;
}

/** Returned by the `context` and `before_agent_start` handlers. */
export interface HandlerResult {
  message?: BpMessage;
}

/** Detected OMP sub-agent type for the current session. */
export type AgentType = 'planner' | 'executor' | 'reviewer' | 'default';

// ---------------------------------------------------------------------------
// Env-bypass and config-skip predicates. Each handler invokes these at entry.
// ---------------------------------------------------------------------------

/** True when the user has explicitly disabled all bp extension handlers. */
export function isDisabled(): boolean {
  return process.env.BP_HOOKS === '0' || process.env.BP_DISABLE_HOOKS === '1';
}

// (hasBpConfig / detectAgentType / handleSessionStart / handleBeforeAgentStart
//  / handleContext / renderCompactBlock are filled in by T-26..T-34.)
