/**
 * bp commit <message> — git commit that respects commitDocs config.
 *
 * If commitDocs is false in bp/config.yaml, bp/ directory paths are
 * filtered out before staging. The remaining files (source code, etc.)
 * are committed normally.
 *
 * Usage: bp commit "<message>" [--files <path>...]
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../core/config.js';
import { findBpDir } from './_utils.js';

export function register(program: any): void {
  program
    .command('commit <message>')
    .description('Git commit that respects commitDocs config (filters bp/ path when disabled)')
    .option('--files <paths...>', 'files to stage (default: bp/)')
    .action(commitHandler);
}

function commitHandler(message: string, options: { files?: string[] }) {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  const cwd = join(bpDir, '..');
  let docMode = true;

  // Check commitDocs config
  try {
    const config = loadConfig(bpDir);
    docMode = config.commitDocs;
  } catch {
    // config unreadable — default to committing everything
  }

  // Resolve files to stage
  let candidates = options.files ?? ['bp/'];

  // Filter bp/ paths when commitDocs is false
  const bpRel = 'bp/';
  let finalFiles: string[];
  if (!docMode) {
    finalFiles = candidates.filter((f) => !f.startsWith(bpRel) && !f.startsWith(bpDir));
    if (finalFiles.length === 0) {
      console.log('nothing to commit (bp/ files filtered by commitDocs: false)');
      return;
    }
  } else {
    finalFiles = candidates;
  }

  // git init if needed
  try {
    if (!existsSync(join(cwd, '.git'))) {
      execSync('git init', { cwd, stdio: 'pipe' });
      console.log('git repository initialized');
    }
  } catch {
    console.warn('git init failed, skipping commit');
    return;
  }

  // git add
  try {
    execFileSync('git', ['add', ...finalFiles], { cwd, stdio: 'pipe' });
  } catch {
    console.warn('git add failed, skipping commit');
    return;
  }

  // Check if there is anything to commit
  try {
    const status = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf-8', stdio: 'pipe' });
    if (!status.trim()) {
      console.log('nothing to commit (clean working tree)');
      return;
    }
  } catch {
    // git status failed — try commit anyway
  }

  // git commit via temp file (avoids shell escaping issues)
  const msgFile = join(cwd, '.git', 'COMMIT_EDITMSG_TMP');
  try {
    writeFileSync(msgFile, message, 'utf-8');
    execFileSync('git', ['commit', '-F', msgFile], { cwd, encoding: 'utf-8', stdio: 'pipe' });
    console.log(`committed: ${message.slice(0, 60)}`);
  } catch (e: unknown) {
    const stderr = e instanceof Error ? e.message : '';
    if (!stderr.includes('nothing to commit') && !stderr.includes('nothing added')) {
      console.warn(`commit failed: ${stderr.slice(0, 200)}`);
    }
  } finally {
    rmSync(msgFile, { force: true });
  }
}
