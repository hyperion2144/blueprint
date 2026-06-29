/**
 * YAML 解析封装
 * 使用 yaml (eemeli) 2.x + zod
 * - 读+验证（不保留注释）：readYaml
 * - 读 Document（保留注释）：readYamlDoc
 * - 写 Document（保留注释）：writeYamlDoc
 * - 修改+写回（保留注释）：updateYaml
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { parse, parseDocument, Document } from 'yaml';
import type { z } from 'zod';

/**
 * 读取 YAML 并用 zod schema 验证（不保留注释）
 * 用于只读场景（.specwf.yaml 等）
 */
export function readYaml<T>(path: string, schema: z.ZodSchema<T>): T {
  const raw = parse(readFileSync(path, 'utf-8'));
  return schema.parse(raw);
}

/**
 * 读取 YAML 为 Document 对象（保留注释）
 * 用于需要写回的场景（project.yml, state.md）
 */
export function readYamlDoc(path: string): Document {
  return parseDocument(readFileSync(path, 'utf-8'));
}

/**
 * 写入 YAML Document（保留注释）
 */
export function writeYamlDoc(path: string, doc: Document): void {
  writeFileSync(path, String(doc), 'utf-8');
}

/**
 * 修改 YAML 文件并写回（保留注释）
 * updater 接收 Document 对象，原地修改
 */
export function updateYaml(path: string, updater: (doc: Document) => void): void {
  const doc = readYamlDoc(path);
  updater(doc);
  writeYamlDoc(path, doc);
}

/**
 * 解析 YAML 字符串（不保留注释）
 */
export function parseYaml<T>(content: string, schema: z.ZodSchema<T>): T {
  const raw = parse(content);
  return schema.parse(raw);
}
