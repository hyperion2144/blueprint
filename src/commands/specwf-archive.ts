/**
 * specwf archive <change> — 归档 change（delta 合并 + 代码认知回灌 + 目录移动）
 */

import { join } from 'node:path';
import { existsSync, readdirSync, readFileSync, mkdirSync, copyFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadState, updateState } from '../core/state-file.js';
import { mergeAndWrite } from '../core/delta-merge.js';
import { extractFromGitDiff, writeExtractionToSpec } from '../core/code-extract.js';
import { archiveChangeDir } from '../core/file-tree.js';

export function register(program: any): void {
  program
    .command('archive <change>')
    .description('归档 change（delta 合并 + 代码回灌）')
    .action(archiveHandler);
}

function archiveHandler(changePath: string) {
  const specwfDir = join(process.cwd(), 'specwf');

  // 解析 change 路径
  const fullChangePath = join(process.cwd(), changePath);
  if (!existsSync(fullChangePath)) {
    console.error(`错误: change 目录不存在: ${changePath}`);
    process.exit(1);
  }

  // 1. delta-spec 合并
  const specsDir = join(fullChangePath, 'specs');
  if (existsSync(specsDir)) {
    mergeDeltaSpecs(specsDir, specwfDir);
    console.log('✓ delta-specs 合并完成');
  }

  // 2. 检查 summary.md 是否存在
  const summaryPath = join(fullChangePath, 'summary.md');
  if (!existsSync(summaryPath)) {
    console.warn('⚠ summary.md 不存在。建议先使用 `specwf template change-summary` 生成变更总结。');
  }

  // 3. 代码认知提取
  const repoDir = process.cwd();
  const extractResult = extractFromGitDiff(repoDir, fullChangePath);
  if (extractResult.available && extractResult.extractions.length > 0) {
    for (const extraction of extractResult.extractions) {
      writeExtractionToSpec(join(specwfDir, 'specs'), extraction);
    }
    if (extractResult.extractions.length > 0) {
      console.log(`✓ 代码认知提取完成 (${extractResult.extractions.length} 个域)`);
    }
  }

  // 3. 移动到 archive/
  const archiveDir = archiveChangeDir(specwfDir, fullChangePath);
  console.log(`✓ 归档到: ${archiveDir}`);

  // 从 git 跟踪中移除旧路径
  try {
    execSync(`git rm -r "${changePath}" 2>/dev/null || true`, { cwd: process.cwd() });
  } catch {
    // git rm 非关键失败
  }

  // 4. 更新 state.md
  const changeName = changePath.split('/').pop() ?? 'unknown';
  try {
    updateState(specwfDir, (state) => {
      const change = state.changes.find((c) => c.name === changeName);
      if (change) {
        change.status = 'archived';
        return;
      }
      const adhoc = state.adhoc.find((c) => c.name === changeName);
      if (adhoc) {
        adhoc.status = 'archived';
      }
    });
    console.log('✓ state.md 已更新');
  } catch {
    // state 更新非关键，忽略
  }

  console.log('归档完成。');
}

/** 合并 delta-specs 到全局 specs/ */
function mergeDeltaSpecs(deltaDir: string, specwfDir: string): void {
  const entries = readdirSync(deltaDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const deltaSpecPath = join(deltaDir, entry.name, 'spec.md');
    const liveSpecPath = join(specwfDir, 'specs', entry.name, 'spec.md');

    if (!existsSync(deltaSpecPath)) continue;

    if (!existsSync(liveSpecPath)) {
      mkdirSync(join(specwfDir, 'specs', entry.name), { recursive: true });
      copyFileSync(deltaSpecPath, liveSpecPath);
      continue;
    }

    const result = mergeAndWrite(liveSpecPath, deltaSpecPath);

    if (result.type === 'conflict') {
      console.warn(`⚠ 合并冲突: ${entry.name}/spec.md`);
      for (const c of result.conflicts) {
        console.warn(`   节: ${c.section}`);
      }
    }
  }
}
