/**
 * Markdown frontmatter 解析封装
 * 使用 gray-matter 4.x
 * - 解析 frontmatter + body
 * - 生成 frontmatter + body
 * - 读取文件 + 解析
 */

import matter from 'gray-matter';
import { readFileSync } from 'node:fs';

/** frontmatter 解析结果 */
export interface FrontmatterResult {
  /** frontmatter 数据（YAML 解析后的对象） */
  data: Record<string, unknown>;
  /** Markdown body（frontmatter 之后的内容） */
  content: string;
}

/**
 * 解析 frontmatter + body
 * @param content 带 frontmatter 的 Markdown 字符串
 */
export function parseFrontmatter(content: string): FrontmatterResult {
  const parsed = matter(content);
  return {
    data: parsed.data as Record<string, unknown>,
    content: parsed.content,
  };
}

/**
 * 生成 frontmatter + body
 * @param data frontmatter 数据
 * @param body Markdown body
 */
export function stringifyFrontmatter(
  data: Record<string, unknown>,
  body: string,
): string {
  return matter.stringify(body, data);
}

/**
 * 读取文件并解析 frontmatter
 * @param path 文件路径
 */
export function readFrontmatterFile(path: string): FrontmatterResult {
  return parseFrontmatter(readFileSync(path, 'utf-8'));
}
