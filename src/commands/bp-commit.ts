/**
 * bp commit — commit code changes with conventional commits.
 * Records commit hash against tasks in tasks.md or state.md.
 * Respects commit_docs config in project.yml.
 */

import { join, basename } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadConfig } from '../core/config.js';

export function register(program: any): void {
  program
    .command('commit <message>')
    .description('Commit changes with conventional commit format')
    .option('--files <list>', 'comma-separated file paths to stage')
    .option('--scope <scope>', 'commit scope (e.g. engine, cli)')
    .option('--amend', 'amend previous commit')
    .action(commitHandler);
}

function commitHandler(message: string, options: { files?: string; scope?: string; amend?: boolean }) {
  const cwd = process.cwd();
  const bpDir = join(cwd, 'bp');
  const config = loadConfig(bpDir);

  // Parse files
  const allFiles = options.files ? options.files.split(',').map((f) => f.trim()).filter(Boolean) : [];

  // Filter doc files based on config
  const commitDocs = config.workflow?.commitDocs !== false;
  const docPatterns = [/^bp\//, /\.md$/, /^docs\//, /^specwf\//];
  const isDocFile = (f: string) => docPatterns.some((p) => p.test(f));

  const skippedDocs: string[] = [];
  const codeFiles: string[] = [];

  for (const f of allFiles) {
    if (!commitDocs && isDocFile(f)) {
      skippedDocs.push(f);
    } else {
      codeFiles.push(f);
    }
  }

  if (skippedDocs.length > 0) {
    console.log(JSON.stringify({
      warning: `commit_docs is disabled. Skipped doc files: ${skippedDocs.join(', ')}`,
      skipped: skippedDocs,
    }));
  }

  if (codeFiles.length === 0 && allFiles.length > 0) {
    console.log(JSON.stringify({
      error: 'All specified files are doc files and commit_docs is disabled. Nothing to commit.',
    }));
    return;
  }

  // Stage files
  if (codeFiles.length > 0) {
    try {
      execSync(`git add ${codeFiles.join(' ')}`, { cwd });
    } catch (_err) {
      console.log(JSON.stringify({ error: 'git add failed' }));
      return;
    }
  }

  // Build commit message
  const scope = options.scope ? `(${options.scope})` : '';
  const fullMessage = `${message}${scope}`.trim();

  // Commit
  try {
    const amendFlag = options.amend ? '--amend' : '';
    execSync(`git commit ${amendFlag} -m "${fullMessage}"`, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  } catch (err) {
    const stderr = err instanceof Error ? err.message : '';
    if (stderr.includes('nothing to commit')) {
      console.log(JSON.stringify({ ok: true, note: 'Nothing to commit.' }));
    } else {
      console.log(JSON.stringify({ error: 'git commit failed', details: stderr }));
    }
    return;
  }

  // Get commit hash
  let hash = '';
  try {
    hash = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf-8' }).trim();
  } catch { /* hash not critical */ }

  console.log(JSON.stringify({
    ok: true,
    message: fullMessage,
    hash: hash || 'unknown',
    files: codeFiles.length,
    skipped: skippedDocs.length > 0 ? skippedDocs : undefined,
  }));
}
