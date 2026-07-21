/**
 * OMP Extension runtime — the source-of-truth module for the OMP Extension
 * (PR-4). Re-exports the bundled string constants from `src/templates/omp/`
 * and provides TypeScript handler helpers that the integration test
 * exercises directly. The handlers inlined inside `EXTENSION_SOURCE` and
 * the exported helpers here are kept in lockstep by the T-26..T-37
 * behavior tasks; the snapshot test (T-38) pins the bundled source.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { generateCompactContext, formatContextCompact } from '../../core/spec-injector.js';
import { parseContextJsonl } from '../../core/context-refs.js';
import type { ContextRefRow } from '../../types/context-refs.js';
import { deriveState } from '../../commands/bp-state.js';
export { EXTENSION_SOURCE } from '../../templates/omp/extension.tmpl.js';

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

/** True when `bp/config.yaml` exists at the given cwd. */
export function hasBpConfig(cwd: string | undefined): boolean {
  if (!cwd) return false;
  return existsSync(join(cwd, 'bp', 'config.yaml'));
}

/** Detect sub-agent type from OMP agentTemplate name. */
export function detectAgentType(ctx: ExtensionContext): AgentType {
  const tpl = ctx.agentTemplate ?? '';
  if (tpl.includes('planner')) return 'planner';
  if (tpl.includes('executor')) return 'executor';
  if (tpl.includes('reviewer')) return 'reviewer';
  return 'default';
}

/**
 * Render the `<bp-context>...</bp-context>` compact markdown block for the
 * given cwd. Returns a minimal block (just the tag pair) when bp/config.yaml
 * is missing or when cwd is undefined.
 */
export function generateCompactBlock(cwd: string | undefined): string {
  if (!cwd || !hasBpConfig(cwd)) {
    return '<bp-context>\n</bp-context>';
  }
  try {
    const ctx = generateCompactContext(join(cwd, 'bp'));
    return formatContextCompact(ctx);
  } catch {
    return '<bp-context>\n</bp-context>';
  }
}

/** Derive a human-readable state summary from deriveState() output. */
function formatStateSummary(bpDir: string): string {
  try {
    const st = deriveState(bpDir);
    const lines = [
      st.milestone ? `${st.milestone.id}: ${st.milestone.name} [${st.milestone.status}]` : '',
      st.phase ? `  Phase ${st.phase.id}: ${st.phase.name} [${st.phase.status}]` : '',
      st.activeChange ? `  Active: ${st.activeChange.name} [${st.activeChange.status}]` : '',
      st.nextAction ? `  Next: ${st.nextAction}` : '',
    ].filter((l) => l);
    return lines.join('\n') || '_no state available_';
  } catch {
    return '_no state available_';
  }
}

/** Read context.jsonl rows for a change; returns [] on any failure. */
function readContextRows(bpDir: string, changeName: string | undefined): ContextRefRow[] {
  if (!changeName) return [];
  const path = join(bpDir, 'changes', changeName, 'context.jsonl');
  if (!existsSync(path)) return [];
  try {
    const content = readFileSync(path, 'utf-8');
    return parseContextJsonl(content).rows;
  } catch {
    return [];
  }
}


/**
 * Render the augmented body for sub-agent variants (planner / executor / reviewer).
 * Returns the paths-only block when `agentType === 'default'`.
 */
function renderAugmentedBody(
  cwd: string,
  agentType: AgentType,
  activeChangeName: string | undefined,
): string {
  const block = generateCompactBlock(cwd);

  if (agentType === 'default') return block;

  const bpDir = join(cwd, 'bp');
  const extra: string[] = [];

  if (agentType === 'planner') {
    extra.push('## Roadmap State');
    extra.push(formatStateSummary(bpDir));
  } else if (agentType === 'executor') {
    const rows = readContextRows(bpDir, activeChangeName);
    if (rows.length === 0) {
      extra.push('_no context.jsonl rows_');
    } else {
      for (const r of rows) {
        const prefix = r.tag === 'guard-rail' ? '> GUARD-RAIL: ' : '';
        const phase = r.phase ? ` [${r.phase}]` : '';
        extra.push(`${prefix}file: ${r.file}${phase} | reason: ${r.reason}`);
      }
    }
  } else if (agentType === 'reviewer') {
    const rows = readContextRows(bpDir, activeChangeName);
    extra.push('## Invariants');
    if (rows.length === 0) {
      extra.push('_no context.jsonl rows_');
    } else {
      for (const r of rows) extra.push(`- ${r.reason}`);
    }
    const tasksPath = join(bpDir, 'changes', activeChangeName ?? '', 'tasks.md');
    if (activeChangeName && existsSync(tasksPath)) {
      try {
        const tasks = readFileSync(tasksPath, 'utf-8').trim();
        if (tasks) {
          extra.push('');
          extra.push('## tasks.md acceptance');
          extra.push(tasks);
        }
      } catch {
        // missing or unreadable tasks.md — omit silently
      }
    }
  }

  return block + '\n\n' + extra.join('\n');
}

/**
 * `session_start` handler. Emits a single `bp-context` custom message
 * whose body is the paths-only compact block for `default` sub-agents and
 * the augmented body (Roadmap State / inline rows / Invariants + tasks) for
 * planner / executor / reviewer.
 */
export async function handleSessionStart(
  _event: unknown,
  ctx: ExtensionContext,
  api: ExtensionAPI,
): Promise<void> {
  if (isDisabled()) return;
  const cwd = ctx.cwd ?? process.cwd();
  if (!hasBpConfig(cwd)) return;

  const agentType = detectAgentType(ctx);
  const body = renderAugmentedBody(cwd, agentType, ctx.activeChangeName);
  api.sendMessage({
    role: 'custom',
    customType: 'bp-context',
    content: [{ type: 'text', text: body }],
    timestamp: Date.now(),
  });
}

/**
 * `before_agent_start` handler. Returns a `bp-workflow-state` custom message
 * derived from `bp/state.md` (the runtime source-of-truth for the active
 * workflow state). Returns `undefined` when the env is bypassed or when
 * bp/config.yaml is missing.
 */
export async function handleBeforeAgentStart(
  _event: unknown,
  ctx: ExtensionContext,
  _api: ExtensionAPI,
): Promise<HandlerResult | undefined> {
  if (isDisabled()) return undefined;
  const cwd = ctx.cwd ?? process.cwd();
  if (!hasBpConfig(cwd)) return undefined;

  const summary = formatStateSummary(join(cwd, 'bp'));
  return {
    message: {
      role: 'custom',
      customType: 'bp-workflow-state',
      content: [{ type: 'text', text: summary }],
      timestamp: Date.now(),
    },
  };
}

/**
 * `context` handler. Implements post-compaction reverse-scan:
 *   - When `lastCompactionTs <= lastInjectionTs` (or both undefined) -> undefined.
 *   - When `lastCompactionTs > lastInjectionTs` AND no recent `bp-workflow-state`
 *     message exists in `ctx.recentMessages`, re-inject the workflow state.
 *   - Otherwise (recent message already present) -> undefined.
 */
export async function handleContext(
  _event: unknown,
  ctx: ExtensionContext,
  _api: ExtensionAPI,
): Promise<HandlerResult | undefined> {
  if (isDisabled()) return undefined;
  const cwd = ctx.cwd ?? process.cwd();
  if (!hasBpConfig(cwd)) return undefined;

  const lastCompaction = ctx.lastCompactionTs ?? 0;
  const lastInjection = ctx.lastInjectionTs ?? 0;

  if (lastCompaction <= lastInjection) return undefined;

  const hasWorkflowState = (ctx.recentMessages ?? []).some(
    (m) => m.customType === 'bp-workflow-state',
  );
  if (hasWorkflowState) return undefined;

  const summary = formatStateSummary(join(cwd, 'bp'));
  return {
    message: {
      role: 'custom',
      customType: 'bp-workflow-state',
      content: [{ type: 'text', text: summary }],
      timestamp: Date.now(),
    },
  };

}