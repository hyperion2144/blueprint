/* 命令工具函数 */

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

/** 写入批量生成的文件 */
export function writeGeneratedFiles(files: { path: string; content: string }[]): void {
  for (const file of files) {
    const dir = file.path.split('/').slice(0, -1).join('/');
    if (dir) mkdirSync(dir, { recursive: true });
    writeFileSync(file.path, file.content, 'utf-8');
    console.log(`  ✓ ${file.path}`);
  }
}
