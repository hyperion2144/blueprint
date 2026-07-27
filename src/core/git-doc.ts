/**
 * git-doc — auto-commit bp/ doc changes.
 * v2 always commits docs. Best-effort: failures are logged but not thrown.
 */

import { execFileSync } from 'node:child_process';
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
  } catch (e) {
    // Config unreadable — surface the issue rather than silently committing.
    console.warn(`\u26a0 auto-commit skipped: config unreadable (${(e as Error).message})`);
    return;
  }

  const msgFile = join(cwd, '.git', 'COMMIT_EDITMSG_TMP');
  try {
    // git init if needed — use execFileSync to avoid shell interpretation.
    if (!existsSync(join(cwd, '.git'))) {
      execFileSync('git', ['init'], { cwd, stdio: 'pipe' });
      console.log('\u2713 git repository initialized');
    }

    const targets = files ?? ['bp/config.yaml'];
    // Use `--` to terminate option parsing so a target starting with `-`
    // (e.g. a file literally named `-e`) is not treated as a git flag.
    execFileSync('git', ['add', '--', ...targets], { cwd, stdio: 'pipe' });

    // Write message to temp file to avoid shell escaping issues
    writeFileSync(msgFile, message, 'utf-8');
    try {
      execFileSync('git', ['commit', '-F', msgFile], { cwd, encoding: 'utf-8', stdio: 'pipe' });
    } catch (e: unknown) {
      const stderr = e instanceof Error ? e.message : '';
      if (!stderr.includes('nothing to commit') && !stderr.includes('nothing added')) {
        console.warn(`\u26a0 auto-commit failed: ${stderr.slice(0, 200)}`);
      }
    }
  } catch (e) {
    console.warn(`\u26a0 auto-commit skipped (git not available or not a repo): ${(e as Error).message}`);
  } finally {
    // Always clean up the temp file, even on crash.
    rmSync(msgFile, { force: true });
  }
}
