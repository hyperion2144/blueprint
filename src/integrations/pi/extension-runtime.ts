/**
 * Pi Extension runtime — the source-of-truth module for the bp Pi Extension
 * (PR-3). Re-exports the bundled string constant from
 * `src/templates/pi/extension.tmpl.ts` and provides TypeScript handler
 * helpers that the integration test exercises directly. The handlers
 * inlined inside `EXTENSION_SOURCE` and the exported helpers here are kept
 * in lockstep by the T-3..T-6 behavior tasks; the snapshot test pins the
 * bundled source.
 *
 * WARNING: logic mirrors the inline TS in src/templates/pi/extension.tmpl.ts.
 * If you change logic here, you MUST update extension.tmpl.ts too (and vice versa).
 */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import type { Dirent } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import { generateCompactContext, formatContextCompact } from '../../core/spec-injector.js';
import { parseContextJsonl } from '../../core/context-jsonl-io.js';
import type { ContextRefRow } from '../../types/context-jsonl-io.js';
import { deriveState } from '../../commands/bp-state.js';
import { parseFrontmatter } from '../../parser/frontmatter.js';
export { EXTENSION_SOURCE } from '../../templates/pi/extension.tmpl.js';

/**
 * Defense-in-depth: assert a resolved path stays under the expected parent.
 * `activeChangeName` is derived from bp state — if that file is tampered
 * with or the resolver returns an unexpected value, `..` segments could
 * otherwise let the extension read arbitrary files outside `bp/changes/`.
 */
function assertWithinChanges(bpDir: string, changeName: string): void {
  const changesRoot = resolve(join(bpDir, 'changes')) + sep;
  const target = resolve(join(bpDir, 'changes', changeName));
  if (!target.startsWith(changesRoot)) {
    throw new Error(`Path traversal blocked: ${changeName} escapes bp/changes/`);
  }
}

/** Detected pi sub-agent type for the current session (from the system prompt text). */
export type AgentType = 'planner' | 'executor' | 'reviewer' | 'codebase-scanner' | 'refactorer' | 'fixer' | 'designer' | 'default';

/** Shape of a custom pi message (content is a plain string on pi's runtime). */
export interface PiMessage {
  role: 'custom';
  customType: string;
  content: string;
  display: boolean;
  timestamp: number;
}

/** Per-event context the pi runtime hands to handlers. */
export interface PiExtensionContext {
  cwd?: string;
  getSystemPrompt?: () => string | undefined;
  activeChangeName?: string;
  recentMessages?: Array<{ role?: string; customType?: string }>;
}

/** pi Extension API surface used by the handlers. */
export interface PiAPI {
  on(event: string, handler: (event: unknown, ctx: PiExtensionContext) => unknown): void;
  sendMessage(msg: PiMessage, opts?: unknown): void;
}


/** Parsed `.pi/agents/*.md` agent definition (frontmatter + body as system prompt). */
export interface PiAgentConfig {
  name: string;
  description: string;
  tools?: string[];
  model?: string;
  systemPrompt: string;
  filePath: string;
}

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

/**
 * Role-title phrases from the real AGENT_PROMPTS bodies (src/templates/agents/index.ts).
 * These are the only stable, disjoint markers: bare role-name substrings do not exist
 * in the shipped prompts ('planner'/'executor' never appear) and cross-contaminate
 * (the reviewer body mentions 'executor', the fixer body mentions 'reviewer').
 */
const AGENT_TYPE_MARKERS: ReadonlyArray<readonly [AgentType, string]> = [
  ['planner', 'Change Design Specialist'],
  ['executor', 'Code Implementation Specialist'],
  ['reviewer', 'Triple Review Specialist'],
  ['codebase-scanner', 'Codebase Scanner'],
  ['refactorer', 'You are the **refactorer** sub-agent'],
  ['fixer', 'You are the **bp-fixer** sub-agent'],
  ['designer', 'Design Consultant'],
];

/** Detect sub-agent type from the effective system prompt text (role-title markers). */
export function detectAgentTypeFromPrompt(prompt: string | undefined): AgentType {
  if (!prompt) return 'default';
  for (const [agentType, marker] of AGENT_TYPE_MARKERS) {
    if (prompt.includes(marker)) return agentType;
  }
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

/** Resolve the active change name from bp state (no execSync — the template derives it from `bp state --json`). */
export function resolveActiveChangeName(cwd: string | undefined): string | undefined {
  if (!cwd || !hasBpConfig(cwd)) return undefined;
  try {
    return deriveState(join(cwd, 'bp')).activeChange?.name ?? undefined;
  } catch {
    return undefined;
  }
}

/** Read context.jsonl rows for a change; returns [] on any failure. */
function readContextRows(bpDir: string, changeName: string | undefined): ContextRefRow[] {
  if (!changeName) return [];
  try {
    assertWithinChanges(bpDir, changeName);
  } catch {
    return [];
  }
  const path = join(bpDir, 'changes', changeName, 'context.jsonl');
  if (!existsSync(path)) return [];
  try {
    const content = readFileSync(path, 'utf-8');
    return parseContextJsonl(content).rows;
  } catch {
    return [];
  }
}

/** Inline a change's context.jsonl rows (path + reason); prefix guard-rail rows. */
function appendContextRows(extra: string[], bpDir: string, changeName: string | undefined): void {
  const rows = readContextRows(bpDir, changeName);
  if (rows.length === 0) {
    extra.push('_no context.jsonl rows_');
    return;
  }
  for (const r of rows) {
    const prefix = r.tag === 'guard-rail' ? '> GUARD-RAIL: ' : '';
    const phase = r.phase ? ` [${r.phase}]` : '';
    extra.push(`${prefix}file: ${r.file}${phase} | reason: ${r.reason}`);
  }
}

/** Extract the `## Summary` section (up to the next `## ` heading) from a refactor report. */
function extractSummaryBlock(report: string): string | null {
  const summaryIdx = report.indexOf('## Summary');
  if (summaryIdx === -1) return null;
  const afterHeading = summaryIdx + '## Summary'.length;
  const nextSection = report.indexOf('\n## ', afterHeading);
  const end = nextSection === -1 ? report.length : nextSection;
  return report.slice(summaryIdx, end).trim();
}

/**
 * Render the augmented body for sub-agent variants (planner / executor /
 * reviewer / refactorer / fixer). Returns the paths-only block when
 * `agentType === 'default'`.
 */
export function renderAugmentedBody(
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
  } else if (agentType === 'designer') {
    // Read-only design role: paths-only context, no augmentation. Explicit
    // branch is the future hook for design-specific state.
  } else if (agentType === 'executor' || agentType === 'fixer') {
    appendContextRows(extra, bpDir, activeChangeName);
  } else if (agentType === 'reviewer') {
    const rows = readContextRows(bpDir, activeChangeName);
    extra.push('## Invariants');
    if (rows.length === 0) {
      extra.push('_no context.jsonl rows_');
    } else {
      for (const r of rows) extra.push(`- ${r.reason}`);
    }
    if (activeChangeName) {
      try {
        assertWithinChanges(bpDir, activeChangeName);
        const tasksPath = join(bpDir, 'changes', activeChangeName, 'tasks.md');
        if (existsSync(tasksPath)) {
          const tasks = readFileSync(tasksPath, 'utf-8').trim();
          if (tasks) {
            extra.push('');
            extra.push('## tasks.md acceptance');
            extra.push(tasks);
          }
        }
      } catch {
        // traversal blocked, or tasks.md missing/unreadable — omit silently
      }
    }
  } else if (agentType === 'refactorer') {
    // Inline the report's ## Summary block so the refactorer knows the
    // module targets without opening the file. Missing report -> no section.
    const reportPath = join(bpDir, '.refactor-report.md');
    if (existsSync(reportPath)) {
      const report = readFileSync(reportPath, 'utf-8');
      const summaryBlock = extractSummaryBlock(report);
      if (summaryBlock) {
        extra.push('## Refactor Targets');
        extra.push(summaryBlock);
      }
    }
  }

  if (extra.length === 0) return block; // no branch augmented (codebase-scanner / refactorer w/o report) — clean block, no trailing newline

  return block + '\n\n' + extra.join('\n');
}

/** Build a custom pi message (display: false — context payload, not TUI output). */
function buildStateMessage(customType: string, content: string): PiMessage {
  return { role: 'custom', customType, content, display: false, timestamp: Date.now() };
}

/**
 * Create the pi extension handler set. Only `session_start` injects
 * context — a single `bp-context` message per session. No per-LLM-call
 * lifecycle hooks (before_agent_start / context) touch the conversation.
 */
export function createPiExtension() {
  return {
    /** `session_start` handler — emits one `bp-context` custom message. */
    async handleSessionStart(_event: unknown, ctx: PiExtensionContext, api: PiAPI): Promise<void> {
      if (isDisabled()) return;
      const cwd = ctx.cwd ?? process.cwd();
      if (!hasBpConfig(cwd)) return;

      const agentType = detectAgentTypeFromPrompt(ctx.getSystemPrompt?.());
      const activeChangeName = ctx.activeChangeName ?? resolveActiveChangeName(cwd);
      const body = renderAugmentedBody(cwd, agentType, activeChangeName);
      api.sendMessage(buildStateMessage('bp-context', body));
    },
  };
}

// ---------------------------------------------------------------------------
// bp_subagent tool helpers (runtime counterparts of the template's tool code).
// ---------------------------------------------------------------------------

/** Normalize a frontmatter `tools` value (string "a, b" or array) to a list. */
function parseToolList(value: unknown): string[] | undefined {
  const raw = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  const tools = raw
    .filter((t): t is string => typeof t === 'string')
    .map((t) => t.trim())
    .filter(Boolean);
  return tools.length > 0 ? tools : undefined;
}

/**
 * Discover valid `.pi/agents/*.md` agent definitions at the given cwd
 * (single-level lookup — the extension template walks ancestors instead).
 * Invalid files (missing string `name` or `description`) are skipped.
 */
export function discoverPiAgents(cwd: string): PiAgentConfig[] {
  const agentsDir = join(cwd, '.pi', 'agents');
  if (!existsSync(agentsDir)) return [];

  let entries: Dirent[];
  try {
    entries = readdirSync(agentsDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const agents: PiAgentConfig[] = [];
  for (const entry of entries) {
    // Lockstep with the extension template's loadPiAgents: only .md agent
    // files are discovered, and symlinked agent files are accepted too (not
    // only regular files).
    if (!entry.name.endsWith('.md')) continue;
    if (!entry.isFile() && !entry.isSymbolicLink()) continue;

    const filePath = join(agentsDir, entry.name);
    let content: string;
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      continue;
    }

    const { data, content: body } = parseFrontmatter(content);
    if (typeof data.name !== 'string' || typeof data.description !== 'string') continue;

    agents.push({
      name: data.name,
      description: data.description,
      tools: parseToolList(data.tools),
      model: typeof data.model === 'string' ? data.model : undefined,
      systemPrompt: body,
      filePath,
    });
  }
  return agents;
}

/** Build the argv for an isolated `pi --mode json -p --no-session` subprocess. */
export function buildSubagentArgs(
  agent: PiAgentConfig,
  task: string,
  opts: { model?: string; thinkingLevel?: string; systemPromptFile?: string },
): string[] {
  const args = ['--mode', 'json', '-p', '--no-session'];
  const model = opts.model ?? agent.model;
  if (model) args.push('--model', model);
  if (opts.thinkingLevel) args.push('--thinking', opts.thinkingLevel);
  if (agent.tools && agent.tools.length > 0) args.push('--tools', agent.tools.join(','));
  if (opts.systemPromptFile) args.push('--append-system-prompt', opts.systemPromptFile);
  args.push(`Task: ${task}`);
  return args;
}

/** JSON.parse a pi JSONL line; null on malformed input. */
export function parseJsonLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}
