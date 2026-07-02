/**
 * spec-injector — context 命令核心
 * 读 state.md 确定作用域 → 按步骤类型确定注入范围 → 输出文件路径 + 行范围
 */

import { join } from 'node:path';
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { loadState } from './state-file.js';
import type { StateFile } from '../types/index.js';

export interface FileRef {
  path: string;
  description?: string;
  /** File content — included for specs and conventions to save agent read calls */
  content?: string;
  ranges?: { start: number; end: number; description?: string }[];
}

export interface ContextResult {
  step: string;
  scope: { type: string; ref: string | null };
  specs: FileRef[];
  conventions: FileRef[];
  changeArtifacts: FileRef[];
  requirements: FileRef[];
}

/** 步骤类型分类 */
const PROJECT_STEPS = ['init', 'grill', 'research', 'roadmap'];
const PHASE_STEPS = ['discuss', 'research-phase', 'split'];
const CHANGE_STEPS = ['plan', 'apply', 'review', 'archive'];

function isProjectStep(step: string): boolean {
  return PROJECT_STEPS.includes(step);
}

function isPhaseStep(step: string): boolean {
  return PHASE_STEPS.includes(step);
}

function isChangeStep(step: string): boolean {
  return CHANGE_STEPS.includes(step);
}

/** 生成 context 输出 */
export function generateContext(bpDir: string, step: string): ContextResult {
  const state = loadState(bpDir);
  const ctx = state.active_context;

  const result: ContextResult = {
    step,
    scope: { type: ctx.type, ref: ctx.ref },
    specs: [],
    conventions: [],
    changeArtifacts: [],
    requirements: [],
  };

  // conventions 总是注入
  result.conventions = getAllConventions(bpDir).map(withContent(bpDir));

  // requirements.md 总是注入
  if (existsSync(join(bpDir, 'requirements.md'))) {
    const reqPath = join(bpDir, 'requirements.md');
    result.requirements.push({
      path: 'requirements.md',
      description: 'Requirements specification',
      content: readContent(reqPath),
    });
  }

  if (isProjectStep(step)) {
    result.specs = getAllSpecs(bpDir).map(withContent(bpDir));
  } else if (isPhaseStep(step)) {
    result.specs = getRelatedSpecs(bpDir, state).map(withContent(bpDir));
  } else if (isChangeStep(step)) {
    result.specs = getRelatedSpecs(bpDir, state).map(withContent(bpDir));
    result.changeArtifacts = getChangeArtifacts(bpDir, state).map(withContent(bpDir));
  }

  return result;
}

/** Read file content, capped at 8KB to avoid context bloat */
function readContent(absPath: string): string | undefined {
  try {
    const content = readFileSync(absPath, 'utf-8');
    return content.length > 8192 ? content.slice(0, 8192) + '\n... [truncated]' : content;
  } catch {
    return undefined;
  }
}

/** Create a withContent mapper bound to bpDir */
function withContent(bpDir: string): (ref: FileRef) => FileRef {
  return (ref: FileRef) => ({
    ...ref,
    content: readContent(join(bpDir, ref.path)),
  });
}

/** 获取所有 specs */
function getAllSpecs(bpDir: string): FileRef[] {
  const specsDir = join(bpDir, 'specs');
  return listSpecFiles(specsDir, 'specs');
}

/** 获取相关 specs（按域匹配） */
function getRelatedSpecs(bpDir: string, state: StateFile): FileRef[] {
  const allSpecs = getAllSpecs(bpDir);
  if (allSpecs.length === 0) return [];

  // 简化：如果 change 名称包含域关键词，匹配 specs 目录
  const ref = state.active_context.ref ?? '';
  const changeName = ref.split('/').pop() ?? '';

  const related = allSpecs.filter((spec) => {
    const domain = spec.path.split('/')[1] ?? '';
    return changeName.toLowerCase().includes(domain.toLowerCase());
  });

  // 无匹配时返回全部
  return related.length > 0 ? related : allSpecs;
}

/** 获取所有 conventions */
function getAllConventions(bpDir: string): FileRef[] {
  const convDir = join(bpDir, 'conventions');
  if (!existsSync(convDir)) return [];
  return readdirSync(convDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => ({ path: `conventions/${f}`, description: 'Project Conventions' }));
}

/** 获取 change artifact文件 */
function getChangeArtifacts(bpDir: string, state: StateFile): FileRef[] {
  const ref = state.active_context.ref;
  if (!ref) return [];

  const changeDir = join(bpDir, ref);
  if (!existsSync(changeDir)) return [];

  const artifacts: FileRef[] = [];
  for (const file of ['proposal.md', 'design.md', 'tasks.md', '.bp.yaml']) {
    const fullPath = join(changeDir, file);
    if (existsSync(fullPath)) {
      artifacts.push({ path: `${ref}/${file}`, description: 'change artifact' });
    }
  }

  // delta-specs
  const specsDir = join(changeDir, 'specs');
  if (existsSync(specsDir)) {
    const deltaSpecs = listSpecFiles(specsDir, `${ref}/specs`);
    artifacts.push(...deltaSpecs);
  }

  return artifacts;
}

/** 递归列出 spec 文件 */
function listSpecFiles(dir: string, prefix: string): FileRef[] {
  if (!existsSync(dir)) return [];
  const results: FileRef[] = [];

  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      results.push(...listSpecFiles(fullPath, `${prefix}/${entry}`));
    } else if (entry.endsWith('.md')) {
      results.push({ path: `${prefix}/${entry}`, description: 'Behavioral Contract' });
    }
  }

  return results;
}

/** 格式化为终端输出 */
export function formatContextTerminal(result: ContextResult): string {
  const lines: string[] = [
    `=== bp context for step: ${result.step} ===`,
    `Scope: ${result.scope.type}${result.scope.ref ? ` (${result.scope.ref})` : ''}`,
    '─'.repeat(60),
  ];

  if (result.specs.length > 0) {
    lines.push('Related specs:');
    for (const spec of result.specs) {
      lines.push(`  ${spec.path.padEnd(40)} # ${spec.description ?? ''}`);
    }
    lines.push('');
  }

  if (result.conventions.length > 0) {
    lines.push('Related conventions:');
    for (const conv of result.conventions) {
      lines.push(`  ${conv.path.padEnd(40)} # ${conv.description ?? ''}`);
    }
    lines.push('');
  }

  if (result.changeArtifacts.length > 0) {
    lines.push('Current change artifacts:');
    for (const art of result.changeArtifacts) {
      lines.push(`  ${art.path}`);
    }
    lines.push('');
  }

  if (result.requirements.length > 0) {
    lines.push('Requirements:');
    for (const req of result.requirements) {
      lines.push(`  ${req.path}`);
    }
    lines.push('');
  }

  lines.push('─'.repeat(60));
  lines.push('Usage: use `read <path>` to load each file.');
  lines.push('Selectors: `read <path>:50-100` for ranges.');

  return lines.join('\n');
}
