/**
 * code-extract — 代码认知提取
 * 从 git diff 提取行为/约束 → 回灌 specs/
 * archive 时调用，AI 辅助提取（标记 AUTO-EXTRACTED）
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export interface CodeExtraction {
  domain: string;
  behaviors: string[];
  constraints: string[];
}

export interface ExtractResult {
  extractions: CodeExtraction[];
  /** 提取是否成功（无 git 仓库时返回空） */
  available: boolean;
}

/**
 * 从 git diff 提取行为变化
 * @param repoDir git 仓库目录
 * @param changeDir change 目录（用于查找 delta-specs 确定域）
 */
export function extractFromGitDiff(
  repoDir: string,
  changeDir?: string,
): ExtractResult {
  const diff = getGitDiff(repoDir);
  if (diff === null) {
    return { extractions: [], available: false };
  }

  const domains = changeDir ? detectDomains(changeDir) : ['general'];
  const extractions: CodeExtraction[] = [];

  for (const domain of domains) {
    const behaviors = extractBehaviors(diff, domain);
    const constraints = extractConstraints(diff, domain);

    if (behaviors.length > 0 || constraints.length > 0) {
      extractions.push({ domain, behaviors, constraints });
    }
  }

  return { extractions, available: true };
}

/** 获取 git diff（unstaged + staged + 最近 commit） */
function getGitDiff(repoDir: string): string | null {
  try {
    // 获取工作区与 HEAD 的 diff
    const diff = execSync('git diff HEAD', {
      cwd: repoDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (diff.trim()) return diff;

    // 如果没有 unstaged，获取最近 commit 的 diff
    const lastCommit = execSync('git diff HEAD~1 HEAD', {
      cwd: repoDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    return lastCommit.trim() ? lastCommit : null;
  } catch {
    return null;
  }
}

/** 从 change 的 delta-specs 目录检测域 */
function detectDomains(changeDir: string): string[] {
  const specsDir = join(changeDir, 'specs');
  if (!existsSync(specsDir)) return ['general'];

  try {
    return readdirSync(specsDir, { withFileTypes: true })
      .filter((e: { isDirectory: () => boolean }) => e.isDirectory())
      .map((e: { name: string }) => e.name);
  } catch {
    return ['general'];
  }
}

/** 从 diff 中提取行为关键词 */
function extractBehaviors(diff: string, _domain: string): string[] {
  const behaviors: string[] = [];
  const lines = diff.split('\n');

  for (const line of lines) {
    // 检测新增的行为模式（简化版）
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.slice(1).trim();
      // 检测 RFC 2119 关键词
      if (/\b(SHALL|MUST|SHOULD|MAY)\b/.test(content)) {
        behaviors.push(content);
      }
      // 检测函数/方法定义（行为入口）
      if (/^(export\s+)?(async\s+)?function\s+/.test(content) || 
          /^(export\s+)?class\s+/.test(content)) {
        behaviors.push(`新增: ${content}`);
      }
    }
  }

  return behaviors;
}

/** 从 diff 中提取约束关键词 */
function extractConstraints(diff: string, _domain: string): string[] {
  const constraints: string[] = [];
  const lines = diff.split('\n');

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.slice(1).trim();
      // 检测验证逻辑
      if (/^(throw|assert|if\s*\()/.test(content) && !content.startsWith('//')) {
        constraints.push(`约束: ${content}`);
      }
      // 检测类型注解（接口约束）
      if (/^(export\s+)?(interface|type)\s+/.test(content)) {
        constraints.push(`类型约束: ${content}`);
      }
    }
  }

  return constraints;
}

/** 将提取结果写入 spec 文件（标记 AUTO-EXTRACTED） */
export function writeExtractionToSpec(
  specsDir: string,
  extraction: CodeExtraction,
): void {
  const domainDir = join(specsDir, extraction.domain);
  const specPath = join(domainDir, 'spec.md');

  let existing = '';
  if (existsSync(specPath)) {
    existing = readFileSync(specPath, 'utf-8');
  }

  const section = generateAutoExtractedSection(extraction);
  const updated = existing.trim()
    ? `${existing.trim()}\n\n${section}`
    : section;

  mkdirSync(domainDir, { recursive: true });
  writeFileSync(specPath, updated, 'utf-8');
}

/** 生成 AUTO-EXTRACTED 段落 */
function generateAutoExtractedSection(extraction: CodeExtraction): string {
  const lines: string[] = [
    '<!-- AUTO-EXTRACTED: 以下内容由 code-extract 从代码 diff 提取，请人工审核 -->',
    '',
    '## Auto-Extracted Behaviors',
    '',
  ];

  if (extraction.behaviors.length > 0) {
    lines.push('### Detected Behaviors', '');
    for (const b of extraction.behaviors) {
      lines.push(`- ${b}`);
    }
    lines.push('');
  }

  if (extraction.constraints.length > 0) {
    lines.push('### Detected Constraints', '');
    for (const c of extraction.constraints) {
      lines.push(`- ${c}`);
    }
    lines.push('');
  }

  lines.push('<!-- END AUTO-EXTRACTED -->');

  return lines.join('\n');
}
