/**
 * state.md 读写
 * 使用 gray-matter 解析 frontmatter + zod 验证
 */

import { join } from 'node:path';
import { z } from 'zod';
import { readFrontmatterFile, stringifyFrontmatter } from '../parser/frontmatter.js';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import type { StateFile, ChangeState } from '../types/index.js';

const STATE_FILE = 'state.md';

/** zod schema for state.md frontmatter */
const ChangeStateSchema = z.object({
  name: z.string(),
  status: z.string(),
  depends_on: z.array(z.string()).optional().default([]),
});

const StateFileSchema = z.object({
  project: z.object({
    name: z.string(),
    status: z.string(),
    current_milestone: z.string().nullable(),
    current_phase: z.string().nullable(),
  }),
  active_context: z.object({
    type: z.enum(['project', 'milestone', 'phase', 'change', 'adhoc']),
    ref: z.string().nullable(),
    step: z.string(),
  }),
  changes: z.array(ChangeStateSchema).optional().default([]),
  adhoc: z.array(ChangeStateSchema).optional().default([]),
});

/** state.md 路径 */
export function statePath(bpDir: string): string {
  return join(bpDir, STATE_FILE);
}

/** 读取并验证 state.md。若未初始化则输出错误并退出。 */
export function loadState(bpDir: string): StateFile {
  const path = statePath(bpDir);
  if (!existsSync(path)) {
    console.error('bp project not initialized. Run `bp init` first.');
    process.exit(1);
  }
  const result = readFrontmatterFile(path);
  return StateFileSchema.parse(result.data) as unknown as StateFile;
}

/** 写入 state.md（frontmatter + body） */
export function saveState(bpDir: string, state: StateFile): void {
  // 保留现有 body，只更新 frontmatter
  let body: string;
  try {
    const existing = readFrontmatterFile(statePath(bpDir));
    body = existing.content;
  } catch {
    body = generateStateBody(state);
  }
  const output = stringifyFrontmatter(state as unknown as Record<string, unknown>, body);
  writeFileSync(statePath(bpDir), output, 'utf-8');
}

/** 修改 state 并写回 */
export function updateState(bpDir: string, updater: (state: StateFile) => void): void {
  const state = loadState(bpDir);
  updater(state);
  saveState(bpDir, state);
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
