/**
 * bp archive <change> — 归档 change（delta 合并 + 代码认知回灌 + 目录移动）
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
  const bpDir = join(process.cwd(), 'bp');

  // 解析 change 路径
  const fullChangePath = join(process.cwd(), changePath);
  if (!existsSync(fullChangePath)) {
    console.error(`Error: change directory not found: ${changePath}`);
    process.exit(1);
  }

  // 1. delta-spec merge
  const specsDir = join(fullChangePath, 'specs');
  if (existsSync(specsDir)) {
    mergeDeltaSpecs(specsDir, bpDir);
    console.log('✓ delta-specs merged');
  }

  // 2. Check change-summary.md
  const summaryPath = join(fullChangePath, 'change-summary.md');
  if (!existsSync(summaryPath)) {
    console.warn('⚠ change-summary.md not found. Run `bp template change-summary` to generate it.');
  }

  // 3. Code cognition extraction
  const repoDir = process.cwd();
  const extractResult = extractFromGitDiff(repoDir, fullChangePath);
  if (extractResult.available && extractResult.extractions.length > 0) {
    for (const extraction of extractResult.extractions) {
      writeExtractionToSpec(join(bpDir, 'specs'), extraction);
    }
    if (extractResult.extractions.length > 0) {
      console.log(`✓ Code extraction complete (${extractResult.extractions.length} domains)`);
    }
  }

  // 4. Move to archive/
  const archiveDir = archiveChangeDir(bpDir, fullChangePath);
  console.log(`✓ Archived to: ${archiveDir}`);

  // Remove old path from git tracking
  try {
    execSync(`git rm -r "${changePath}" 2>/dev/null || true`, { cwd: process.cwd() });
  } catch {
    // git rm is non-critical
  }

  // 5. Update state.md
  const changeName = changePath.split('/').pop() ?? 'unknown';
  try {
    updateState(bpDir, (state) => {
      const change = state.changes.find((c) => c.name === changeName);
      if (change) {
        // Remove from active changes — move to archive/ dir, not lingering in changes list
        state.changes = state.changes.filter((c) => c.name !== changeName);
      }
      const adhoc = state.adhoc.find((c) => c.name === changeName);
      if (adhoc) {
        state.adhoc = state.adhoc.filter((c) => c.name !== changeName);
      }

      // Reset active_context if it pointed to the archived change
      const currentRef = state.active_context.ref;
      if (currentRef && currentRef.includes(changeName)) {
        // Find next pending change
        const nextChange = state.changes[0];
        const nextAdhoc = state.adhoc[0];
        if (nextAdhoc) {
          state.active_context = { type: 'adhoc', ref: `changes/${nextAdhoc.name}`, step: nextAdhoc.status };
        } else if (nextChange) {
          state.active_context = { type: 'change', ref: `changes/${nextChange.name}`, step: nextChange.status };
        } else {
          // No pending changes — reset to project level
          state.active_context = { type: 'project', ref: null, step: state.project.status };
        }
      }
    });
    console.log('✓ state.md updated');
  } catch {
    // state update is non-critical
  }

  console.log('Archive complete.');
}

/** 合并 delta-specs 到全局 specs/ */
function mergeDeltaSpecs(deltaDir: string, bpDir: string): void {
  const entries = readdirSync(deltaDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const deltaSpecPath = join(deltaDir, entry.name, 'spec.md');
    const liveSpecPath = join(bpDir, 'specs', entry.name, 'spec.md');

    if (!existsSync(deltaSpecPath)) continue;

    if (!existsSync(liveSpecPath)) {
      mkdirSync(join(bpDir, 'specs', entry.name), { recursive: true });
      copyFileSync(deltaSpecPath, liveSpecPath);
      continue;
    }

    const result = mergeAndWrite(liveSpecPath, deltaSpecPath);

    if (result.type === 'conflict') {
      console.warn(`⚠ Merge conflict: ${entry.name}/spec.md`);
      for (const c of result.conflicts) {
        console.warn(`   Section: ${c.section}`);
      }
    }
  }
}
