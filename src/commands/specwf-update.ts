/**
 * specwf update — 更新平台文件（commands + agents + skills）
 */

import { join } from 'node:path';
import { loadConfig } from '../core/config.js';
import { generateAll } from '../generators/index.js';
import { writeGeneratedFiles } from './_utils.js';

export function register(program: any): void {
  program
    .command('update')
    .description('更新平台文件（commands + agents）')
    .option('--dir <path>', 'specwf 目录', 'specwf')
    .action(updateHandler);
}

function updateHandler(options: { dir: string }) {
  const specwfDir = join(process.cwd(), options.dir);

  const config = loadConfig(specwfDir);
  const files = generateAll(config);

  console.log('正在更新平台文件...');
  writeGeneratedFiles(files);
  console.log(`✓ 更新完成 (${files.length} 个文件)`);
}
