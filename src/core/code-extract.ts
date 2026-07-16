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
  available: boolean;
  reason?: string;
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
    const behaviors = extractBehaviors(diff);
    const constraints = extractConstraints(diff);

    if (behaviors.length > 0 || constraints.length > 0) {
      extractions.push({ domain, behaviors, constraints });
    }
  }

  return { extractions, available: true };
}

/** 获取 git diff（unstaged + staged + 最近 commit） */
function getGitDiff(repoDir: string): string | null {
  try {
    const diff = execSync('git diff HEAD', {
      cwd: repoDir,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (diff.trim()) return diff;

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

/** Extract behavior keywords from diff */
function extractBehaviors(diff: string): string[] {
  const behaviors: string[] = [];
  const lines = diff.split('\n');

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.slice(1).trim();
      // Skip comment lines
      if (content.startsWith('//') || content.startsWith('/*') || content.startsWith('*') || content.startsWith('#')) continue;
      // Skip lines containing string literals with RFC2119 keywords
      if (content.includes('"') || content.includes("'") || content.includes('`')) continue;
      // Detect RFC 2119 keywords as standalone words
      if (/\b(SHALL|MUST|SHOULD|MAY)\b/.test(content)) {
        behaviors.push(content);
      }
      // Only emit export declarations as behavior entries
      if (/^export\s+(function|class|const|type|interface)\s+/.test(content)) {
        behaviors.push(content);
      }
    }
  }

  return behaviors;
}
/** Extract constraint keywords from diff */
function extractConstraints(diff: string): string[] {
  const constraints: string[] = [];
  const lines = diff.split('\n');

  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) {
      const content = line.slice(1).trim();
      // Skip comment lines (//, /*, *, #)
      if (content.startsWith('//') || content.startsWith('/*') || content.startsWith('*') || content.startsWith('#')) continue;
      // Skip lines containing string literals
      if (content.includes('"') || content.includes("'") || content.includes('`')) continue;
      // Detect validation logic (word boundary on throw/assert/if)
      if (/^(throw|assert|if)\b/.test(content)) {
        constraints.push(content);
      }
      // Detect type annotations (interface/type constraints)
      if (/^export\s+(interface|type)\s+/.test(content)) {
        constraints.push(content);
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
