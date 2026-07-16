/**
 * state.md 读写
 * 使用 gray-matter 解析 frontmatter + zod 验证
 */

import { join } from 'node:path';
import { z } from 'zod';
import { readFrontmatterFile, stringifyFrontmatter } from '../parser/frontmatter.js';
import { readFileSync, writeFileSync, existsSync, openSync, closeSync, unlinkSync, statSync } from 'node:fs';
import type { StateFile, ChangeState } from '../types/index.js';

const STATE_FILE = 'state.md';

/** zod schema for state.md frontmatter */
const ChangeStateSchema = z.object({
  name: z.string(),
  status: z.string(),
  depends_on: z.array(z.string()).optional().default([]),
});

const CompletedEntrySchema = z.object({
  name: z.string(),
  type: z.enum(['change', 'adhoc']),
  milestone: z.string().nullable(),
  phase: z.string().nullable(),
  archived_at: z.string(),
});
const ReleasedEntrySchema = z.object({
  name: z.string(),
  type: z.enum(['change', 'adhoc']),
  milestone: z.string().nullable(),
  phase: z.string().nullable(),
  released_at: z.string(),
});

const ContextEntrySchema = z.object({
  type: z.enum(['change', 'adhoc']),
  ref: z.string(),
  step: z.string(),
});

const StateFileSchema = z.object({
  project: z.object({
    name: z.string(),
    status: z.string(),
    current_milestone: z.string().nullable(),
    current_phase: z.string().nullable(),
  }),
  active_context: z.object({
    type: z.enum(['project', 'milestone', 'phase', 'change', 'adhoc', 'changes']),
    ref: z.string().nullable(),
    step: z.string(),
    contexts: z.record(z.string(), ContextEntrySchema).optional(),
  }),
  changes: z.array(ChangeStateSchema).optional().default([]),
  adhoc: z.array(ChangeStateSchema).optional().default([]),
  completed: z.array(CompletedEntrySchema).optional().default([]),
  released: z.array(ReleasedEntrySchema).optional().default([]),
});

/** state.md 路径 */
export function statePath(bpDir: string): string {
  return join(bpDir, STATE_FILE);
}

/** 读取并验证 state.md。若未初始化则抛异常。 */
export function loadState(bpDir: string): StateFile {
  const path = statePath(bpDir);
  if (!existsSync(path)) {
    throw new Error('bp project not initialized. Run `bp init` first.');
  }
  const result = readFrontmatterFile(path);
  return StateFileSchema.parse(result.data) as unknown as StateFile;
}

/** Write state.md (frontmatter + body) */
export function saveState(bpDir: string, state: StateFile): void {
  // Preserve existing body, only update frontmatter
  let body: string;
  const stateMdPath = statePath(bpDir);
  if (!existsSync(stateMdPath)) {
    body = generateStateBody(state);
  } else {
    try {
      const existing = readFrontmatterFile(stateMdPath);
      body = existing.content;
    } catch {
      throw new Error('state.md is corrupted; refusing to overwrite. Run `bp state validate` for details.');
    }
  }
  const output = stringifyFrontmatter(state as unknown as Record<string, unknown>, body);
  writeFileSync(stateMdPath, output, 'utf-8');
}
/** Modify state and write back with exclusive file lock to prevent concurrent writes */
export function updateState(bpDir: string, updater: (state: StateFile) => void): void {
  const lockPath = join(bpDir, '.state.lock');
  const MAX_WAIT = 3000;
  const POLL_INTERVAL = 50;
  const STALE_LOCK_MS = 10_000;
  const start = Date.now();
  let fd: number | null = null;

  // Spin-wait for exclusive file lock, holding the FD open for the critical section
  while (Date.now() - start < MAX_WAIT) {
    try {
      fd = openSync(lockPath, 'wx');
      break;
    } catch {
      // Check for stale lock
      try {
        const { mtimeMs } = statSync(lockPath);
        if (Date.now() - mtimeMs > STALE_LOCK_MS) {
          unlinkSync(lockPath);
          continue;
        }
      } catch {
        // Lock vanished or stat failed — retry
      }
      if (Date.now() - start >= MAX_WAIT) {
        throw new Error('Failed to acquire state lock within 3 seconds. Another process may be holding bp/.state.lock.');
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, POLL_INTERVAL);
    }
  }

  try {
    const state = loadState(bpDir);
    updater(state);
    saveState(bpDir, state);
  } finally {
    if (fd !== null) {
      try { closeSync(fd); } catch { /* best effort */ }
    }
    try { unlinkSync(lockPath); } catch { /* best effort cleanup */ }
  }
}

/** 检查 state.md 是否存在 */
export function hasState(bpDir: string): boolean {
  return existsSync(statePath(bpDir));
}

/** 生成 state.md 的 Markdown body */
function generateStateBody(state: StateFile): string {
  const ctx = state.active_context;
  const lines: string[] = [
    '# State',
    '',
    '## Current Position',
    '',
    formatContext(state),
    '',
    '## State Machine',
    '',
    'Project path: `initialized → grill → researched → roadmap-defined`',
    '',
  ];

  // History
  if (state.project) {
    lines.push('## History', '');
    // Preserve existing history from original body
  }

  return lines.join('\n');
}

function formatContext(state: StateFile): string {
  const { type, ref, step } = state.active_context;
  switch (type) {
    case 'project':
      return `Project (${step})`;
    case 'milestone':
      return `Milestone ${state.project.current_milestone ?? '?'} (${step})`;
    case 'phase':
      return `Phase ${state.project.current_phase ?? '?'} (${step})`;
    case 'change':
      return `Change (${ref ?? '?'}) (${step})`;
    case 'adhoc':
      return `Adhoc Change (${ref ?? '?'}) (${step})`;
    default:
      return step;
  }
}
