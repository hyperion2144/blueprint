/**
 * delta-merge — delta-spec 合并引擎
 * 层级感知的三向合并：heading tree + SHA-256 fingerprint + 冲突检测
 */

import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseHeadings } from '../parser/heading-tree.js';
import type { HeadingNode } from '../types/index.js';

export type MergeResult =
  | { type: 'ok'; merged: string }
  | { type: 'conflict'; conflicts: Conflict[] };

export interface Conflict {
  section: string;
  message: string;
  baseContent: string;
  deltaContent: string;
}

/** 计算 SHA-256 指纹 */
export function fingerprint(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

/** 捕获 base 指纹 */
export function captureBaseFingerprint(specPath: string): string | null {
  if (!existsSync(specPath)) return null;
  return fingerprint(readFileSync(specPath, 'utf-8'));
}

/**
 * 合并 delta-spec 到 live spec
 * @param baseSpec live spec 内容
 * @param deltaSpec change delta 内容
 * @param baseFingerprint change 创建时的 spec 指纹（可选）
 */
export function mergeDeltaSpec(
  baseSpec: string,
  deltaSpec: string,
  baseFingerprint?: string,
): MergeResult {
  // 1. 如果有指纹且匹配 → 快速路径：直接替换
  if (baseFingerprint) {
    const liveFingerprint = fingerprint(baseSpec);
    if (liveFingerprint === baseFingerprint) {
      return { type: 'ok', merged: deltaSpec };
    }
  }

  // 2. Check for semantic delta format (ADDED/MODIFIED/REMOVED sections)
  if (hasSemanticSections(deltaSpec)) {
    return semanticMerge(baseSpec, deltaSpec);
  }

  // 3. 通用 heading-tree 合并（向后兼容旧格式 delta-specs）
  const baseTree = parseHeadings(baseSpec);
  const deltaTree = parseHeadings(deltaSpec);
  const merged = mergeTrees(baseTree, deltaTree);

  if (merged.conflicts.length > 0) {
    return { type: 'conflict', conflicts: merged.conflicts };
  }

  return { type: 'ok', merged: renderTree(merged.nodes) };
}

interface MergedNode {
  node: HeadingNode;
  children: MergedNode[];
}

interface MergeOutput {
  nodes: MergedNode[];
  conflicts: Conflict[];
}

/** Check if delta spec uses ADDED/MODIFIED/REMOVED semantic sections */
function hasSemanticSections(deltaSpec: string): boolean {
  return deltaSpec.includes('## ADDED Requirements') ||
    deltaSpec.includes('## MODIFIED Requirements') ||
    deltaSpec.includes('## REMOVED Requirements');
}

/** Extract `### Requirement: X` nodes from under a specific `## ` section */
function extractRequirementsFromSection(
  tree: HeadingNode[],
  sectionTitle: string,
): HeadingNode[] {
  const sectionNode = tree.find(
    (n) => n.level === 2 && n.text === sectionTitle,
  );
  if (!sectionNode) return [];
  return sectionNode.children.filter(
    (n) => n.level === 3 && n.text.startsWith('Requirement:'),
  );
}

/**
 * Semantic merge: process ADDED/MODIFIED/REMOVED sections against global spec.
 * Order: REMOVED first, then MODIFIED, then ADDED.
 */
function semanticMerge(baseSpec: string, deltaSpec: string): MergeResult {
  const baseTree = parseHeadings(baseSpec);
  const deltaTree = parseHeadings(deltaSpec);
  const conflicts: Conflict[] = [];

  // Find the `## Requirements` section in base tree
  const baseReqsSection = baseTree.find(
    (n) => n.level === 2 && n.text === 'Requirements',
  );
  if (!baseReqsSection) {
    conflicts.push({
      section: 'Requirements',
      message: 'Global spec has no `## Requirements` section',
      baseContent: baseSpec,
      deltaContent: deltaSpec,
    });
    return { type: 'conflict', conflicts };
  }

  // Index base requirements by header text
  const baseReqs = new Map<string, HeadingNode>();
  for (const child of baseReqsSection.children) {
    if (child.level === 3 && child.text.startsWith('Requirement:')) {
      baseReqs.set(child.text, child);
    }
  }

  // 1. REMOVED: delete matching headers from base
  const removedReqs = extractRequirementsFromSection(deltaTree, 'REMOVED Requirements');
  // Parse header names from the list items in REMOVED section
  for (const removedNode of removedReqs) {
    // REMOVED section items are list entries like `### Requirement: X` or text
    const headerText = removedNode.text;
    if (baseReqs.has(headerText)) {
      baseReqs.delete(headerText);
    } else {
      conflicts.push({
        section: headerText,
        message: `REMOVED requirement "${headerText}" not found in global spec`,
        baseContent: '',
        deltaContent: removedNode.content,
      });
    }
  }

  // Also check list-style REMOVED entries (e.g., `- \`### Requirement: X\` — reason`)
  const removedSection = deltaTree.find(
    (n) => n.level === 2 && n.text === 'REMOVED Requirements',
  );
  if (removedSection) {
    const removedLines = removedSection.content.split('\n');
    for (const line of removedLines) {
      const match = line.match(/### Requirement:\s*(.+?)(?:`\s*—|$)/);
      if (match) {
        const headerText = `Requirement: ${match[1].trim()}`;
        if (baseReqs.has(headerText)) {
          baseReqs.delete(headerText);
        } else if (!conflicts.some((c) => c.section === headerText)) {
          conflicts.push({
            section: headerText,
            message: `REMOVED requirement "${headerText}" not found in global spec`,
            baseContent: '',
            deltaContent: line,
          });
        }
      }
    }
  }

  // 2. MODIFIED: replace matching headers in base
  const modifiedReqs = extractRequirementsFromSection(deltaTree, 'MODIFIED Requirements');
  for (const modifiedNode of modifiedReqs) {
    if (baseReqs.has(modifiedNode.text)) {
      baseReqs.set(modifiedNode.text, modifiedNode);
    } else {
      conflicts.push({
        section: modifiedNode.text,
        message: `MODIFIED requirement "${modifiedNode.text}" not found in global spec`,
        baseContent: '',
        deltaContent: modifiedNode.content,
      });
    }
  }

  // 3. ADDED: append new headers to base
  const addedReqs = extractRequirementsFromSection(deltaTree, 'ADDED Requirements');
  for (const addedNode of addedReqs) {
    if (baseReqs.has(addedNode.text)) {
      conflicts.push({
        section: addedNode.text,
        message: `ADDED requirement "${addedNode.text}" already exists in global spec`,
        baseContent: baseReqs.get(addedNode.text)?.content ?? '',
        deltaContent: addedNode.content,
      });
    } else {
      baseReqs.set(addedNode.text, addedNode);
    }
  }

  if (conflicts.length > 0) {
    return { type: 'conflict', conflicts };
  }

  // Rebuild the base tree with modified requirements
  baseReqsSection.children = Array.from(baseReqs.values());

  return { type: 'ok', merged: renderSimpleTree(baseTree) };
}

/** Simple markdown renderer for heading tree (no MergedNode wrapper) */
function renderSimpleTree(nodes: HeadingNode[]): string {
  const lines: string[] = [];
  renderSimpleNodes(nodes, lines);
  return lines.join('\n');
}

function renderSimpleNodes(nodes: HeadingNode[], lines: string[]): void {
  for (const node of nodes) {
    lines.push(`${'#'.repeat(node.level)} ${node.text}`);
    if (node.content) lines.push(node.content);
    if (node.children.length > 0) {
      renderSimpleNodes(node.children, lines);
    }
    lines.push('');
  }
}

/** 合并两棵 heading tree */
function mergeTrees(base: HeadingNode[], delta: HeadingNode[]): MergeOutput {
  const conflicts: Conflict[] = [];
  const nodes: MergedNode[] = [];

  const baseIndex = indexNodes(base);
  const deltaIndex = indexNodes(delta);
  const allKeys = new Set([...baseIndex.keys(), ...deltaIndex.keys()]);

  for (const key of allKeys) {
    const b = baseIndex.get(key);
    const d = deltaIndex.get(key);

    if (b && !d) {
      // base 有 delta 无 → 保留
      nodes.push({ node: b, children: b.children.map((c) => ({ node: c, children: [] })) });
    } else if (!b && d) {
      // delta 新增 → 添加
      nodes.push({ node: d, children: d.children.map((c) => ({ node: c, children: [] })) });
    } else if (b && d) {
      // 两边都有 → 合并
      const childMerge = mergeTrees(b.children, d.children);

      if (b.content === d.content) {
        // content 相同 → 只合并子节点
        nodes.push({ node: b, children: childMerge.nodes });
      } else {
        // content 不同 → 尝试行级合并
        const lineMerge = tryLineMerge(b.content, d.content);
        if (lineMerge !== null) {
          nodes.push({ node: { ...b, content: lineMerge }, children: childMerge.nodes });
        } else {
          conflicts.push({
            section: b.text,
            message: `Content conflict in section: ${b.text}`,
            baseContent: b.content,
            deltaContent: d.content,
          });
          // 冲突时保留 base
          nodes.push({ node: b, children: childMerge.nodes });
        }
      }

      conflicts.push(...childMerge.conflicts);
    }
  }

  return { nodes, conflicts };
}

/** 索引节点：level:text → node */
function indexNodes(nodes: HeadingNode[]): Map<string, HeadingNode> {
  const map = new Map<string, HeadingNode>();
  for (const node of nodes) {
    map.set(`${node.level}:${node.text}`, node);
  }
  return map;
}

/** 行级合并：如果 delta 只追加不删除，合并保留两边 */
function tryLineMerge(baseText: string, deltaText: string): string | null {
  const baseLines = baseText.split('\n');
  const deltaLines = deltaText.split('\n');
  const baseSet = new Set(baseLines);

  const removedFromBase = baseLines.filter(
    (l) => l.trim() && !deltaLines.includes(l),
  );

  if (removedFromBase.length === 0) {
    // 没有删除 → 只是追加 → 合并
    const result = [...baseLines];
    for (const line of deltaLines) {
      if (!baseSet.has(line)) {
        result.push(line);
      }
    }
    return result.join('\n');
  }

  return null;
}

/** 渲染 heading tree 为 Markdown */
function renderTree(nodes: MergedNode[]): string {
  const lines: string[] = [];
  renderNodes(nodes, lines);
  return lines.join('\n').trim();
}

function renderNodes(nodes: MergedNode[], lines: string[]): void {
  for (const { node, children } of nodes) {
    lines.push(`${'#'.repeat(node.level)} ${node.text}`);
    if (node.content) {
      lines.push('');
      lines.push(node.content);
    }
    if (children.length > 0) {
      lines.push('');
      renderNodes(children, lines);
    }
    lines.push('');
  }
}

/** 合并并写入文件 */
export function mergeAndWrite(
  liveSpecPath: string,
  deltaSpecPath: string,
  baseFingerprint?: string,
): MergeResult {
  const baseSpec = readFileSync(liveSpecPath, 'utf-8');
  const deltaSpec = readFileSync(deltaSpecPath, 'utf-8');
  const result = mergeDeltaSpec(baseSpec, deltaSpec, baseFingerprint);

  if (result.type === 'ok') {
    writeFileSync(liveSpecPath, result.merged, 'utf-8');
  }

  return result;
}
