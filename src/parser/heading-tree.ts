/**
 * Markdown heading tree 解析器
 * 将 Markdown 解析为 heading 树结构
 * 支持 # 到 ######（level 1-6）
 */

import type { HeadingNode } from '../types/index.js';

/**
 * 解析 Markdown 为 heading tree
 * @param markdown Markdown 字符串
 * @returns 顶层 heading 列表（level 1 的 heading 们）
 */
export function parseHeadings(markdown: string): HeadingNode[] {
  const lines = markdown.split('\n');
  const nodes: HeadingNode[] = [];
  const stack: { node: HeadingNode; level: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^(#{1,6})\s+(.+)$/);

    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim();
    const lineNum = i + 1;

    // 收集该 heading 下的直接内容——遇到任何 heading 就停止
    const contentLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const nextMatch = lines[j].match(/^(#{1,6})\s+(.+)$/);
      if (nextMatch) break;
      contentLines.push(lines[j]);
    }
    const content = contentLines.join('\n').trim();

    const node: HeadingNode = { level, text, line: lineNum, children: [], content };

    // 弹出栈中级别 >= 当前的节点
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      nodes.push(node);
    } else {
      stack[stack.length - 1].node.children.push(node);
    }

    stack.push({ node, level });
  }

  return nodes;
}

/**
 * 在 heading tree 中查找指定文本的 heading
 * @param root 顶层 heading 列表
 * @param text heading 文本（精确匹配）
 * @returns 找到的 heading 或 null
 */
export function findHeading(root: HeadingNode[], text: string): HeadingNode | null {
  for (const node of root) {
    if (node.text === text) return node;
    const found = findHeading(node.children, text);
    if (found) return found;
  }
  return null;
}

/**
 * 在 heading tree 中查找包含指定前缀的 heading
 * @param root 顶层 heading 列表
 * @param prefix heading 文本前缀
 * @returns 找到的所有匹配 heading
 */
export function findHeadingsByPrefix(root: HeadingNode[], prefix: string): HeadingNode[] {
  const results: HeadingNode[] = [];
  for (const node of root) {
    if (node.text.startsWith(prefix)) results.push(node);
    results.push(...findHeadingsByPrefix(node.children, prefix));
  }
  return results;
}
