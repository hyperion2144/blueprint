/**
 * bp commit <message> — git commit that respects commitDocs config.
 *
 * If commitDocs is false in bp/config.yaml, bp/ directory paths are
 * filtered out before staging. The remaining files (source code, etc.)
 * are committed normally.
 *
 * Usage: bp commit "<message>" [--files <path>...]
 */

import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../core/config.js';
import type { Command } from 'commander';
import { findBpDir } from './_utils.js';

export function register(program: Command): void {
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
  // Default to the SAFER behavior (don't stage bp/) when config is unreadable.
  // Previously this defaulted to `true` (stage everything), which silently
  // inverted the user's intent (`commitDocs: false`) on a corrupt config.
  let docMode = false;

  // Check commitDocs config
  try {
    const config = loadConfig(bpDir);
    docMode = config.commitDocs;
  } catch (e) {
    console.warn(`\u26a0 config unreadable, defaulting to commitDocs=false (bp/ excluded): ${(e as Error).message}`);
  }

  // Resolve files to stage
  const candidates = options.files ?? ['bp/'];

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

  // git init if needed — use execFileSync (not execSync) to avoid shell.
  try {
    if (!existsSync(join(cwd, '.git'))) {
      execFileSync('git', ['init'], { cwd, stdio: 'pipe' });
      console.log('git repository initialized');
    }
  } catch (e) {
    console.warn(`git init failed, skipping commit: ${(e as Error).message}`);
    return;
  }

  // git add — use `--` so a target starting with `-` isn't treated as a flag.
  try {
    execFileSync('git', ['add', '--', ...finalFiles], { cwd, stdio: 'pipe' });
  } catch (e) {
    console.warn(`git add failed, skipping commit: ${(e as Error).message}`);
    return;
  }

  // Check if there is anything to commit
  try {
    const status = execFileSync('git', ['status', '--porcelain'], { cwd, encoding: 'utf-8', stdio: 'pipe' });
    if (!status.trim()) {
      console.log('nothing to commit (clean working tree)');
      return;
    }
  } catch (e) {
    // git status failed — try commit anyway, but surface the issue.
    console.warn(`\u26a0 git status failed, attempting commit anyway: ${(e as Error).message}`);
  }

  // git commit via temp file (avoids shell escaping issues).
  // Use mkdtemp-style path under .git/ to avoid races with concurrent
  // `bp commit` invocations overwriting a fixed filename.
  const msgFile = join(cwd, '.git', `COMMIT_EDITMSG_TMP_${process.pid}`);
  try {
    writeFileSync(msgFile, message, 'utf-8');
    execFileSync('git', ['commit', '-F', msgFile], { cwd, encoding: 'utf-8', stdio: 'pipe' });
    // Use execFileSync (not execSync) for consistency with the rest of the file.
    const hash = execFileSync('git', ['rev-parse', 'HEAD'], { cwd, encoding: 'utf-8' }).trim();
    console.log(`committed: ${hash.slice(0, 7)} ${message.slice(0, 60)}`);
  } catch (e: unknown) {
    const stderr = e instanceof Error ? e.message : '';
    if (!stderr.includes('nothing to commit') && !stderr.includes('nothing added')) {
      console.warn(`commit failed: ${stderr.slice(0, 200)}`);
    }
  } finally {
    rmSync(msgFile, { force: true });
  }
}
