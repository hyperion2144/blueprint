/**
 * git-doc — auto-commit bp/ doc changes.
 * v2 always commits docs. Best-effort: failures are logged but not thrown.
 */

import { execFileSync, execSync } from 'node:child_process';
import { existsSync, writeFileSync, rmSync } from 'node:fs';
import { loadConfig } from './config.js';
import { join } from 'node:path';

/**
 * Auto-commit bp/ doc changes.
 * Initializes git repo if none exists. Safely skips when there's nothing to commit.
 *
 * @param bpDir - bp/ directory path
 * @param cwd - repo root (parent of bp/)
 * @param message - commit message
 * @param files - files to stage (default: ['bp/config.yaml'])
 */
export function commitDocChanges(bpDir: string, cwd: string, message: string, files?: string[]): void {
  // Check if commitDocs is enabled in config
  try {
    const config = loadConfig(bpDir);
    if (!config.commitDocs) return;
  } catch {
    return; // config not available - skip silently
  }

  try {
    // git init if needed
    if (!existsSync(join(cwd, '.git'))) {
      execSync('git init', { cwd, stdio: 'pipe' });
      console.log('\u2713 git repository initialized');
    }

    const targets = files ?? ['bp/config.yaml'];
    execFileSync('git', ['add', ...targets], { cwd, stdio: 'pipe' });

    // Write message to temp file to avoid shell escaping issues
    const msgFile = join(cwd, '.git', 'COMMIT_EDITMSG_TMP');
    writeFileSync(msgFile, message, 'utf-8');
    try {
      execFileSync('git', ['commit', '-F', msgFile], { cwd, encoding: 'utf-8', stdio: 'pipe' });
    } catch (e: unknown) {
      const stderr = e instanceof Error ? e.message : '';
      if (!stderr.includes('nothing to commit') && !stderr.includes('nothing added')) {
        console.warn(`\u26a0 auto-commit failed: ${stderr.slice(0, 200)}`);
      }
    }
    rmSync(msgFile, { force: true });
  } catch {
    console.warn('\u26a0 auto-commit skipped (git not available or not a repo)');
  }
}
