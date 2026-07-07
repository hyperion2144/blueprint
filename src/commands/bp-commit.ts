/**
 * bp commit <message> — conventional commit with hash recording.
 *
 * - Filters doc files when commit_docs is disabled in project.yml
 * - --task <id> records commit hash next to the task in tasks.md
 * - --record appends commit to state.md history
 * - Returns structured JSON: hash, files, skipped, records written
 */

import { resolve, join, basename } from 'node:path';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { execSync, execFileSync } from 'node:child_process';
import { loadConfig } from '../core/config.js';
import { loadState, saveState } from '../core/state-file.js';

export function register(program: any): void {
  program
    .command('commit <message>')
    .description('Commit changes with conventional commit format, record hash to tasks.md')
    .option('--files <list>', 'comma-separated file paths to stage')
    .option('--scope <scope>', 'commit scope (e.g. engine, cli)')
    .option('--task <id>', 'task ID to record hash against (e.g. task-1.1)')
    .option('--tasks-path <path>', 'path to tasks.md (auto-detected if omitted)')
    .option('--record', 'append commit to state.md history')
    .option('--amend', 'amend previous commit')
    .action(commitHandler);
}

// ── Types ────────────────────────────────────────────────────────

interface CommitResult {
  ok?: boolean;
  error?: string;
  note?: string;
  message?: string;
  hash?: string;
  files?: number;
  skipped?: string[];
  taskRecorded?: { task: string; hash: string; path: string };
  stateRecorded?: boolean;
  hint?: string;
}

// ── Main handler ─────────────────────────────────────────────────

function commitHandler(
  message: string,
  options: {
    files?: string;
    scope?: string;
    task?: string;
    tasksPath?: string;
    record?: boolean;
    amend?: boolean;
  },
): void {
  const cwd = process.cwd();
  const bpDir = join(cwd, 'bp');
  const config = loadConfig(bpDir);

  const allFiles = options.files
    ? options.files.split(',').map((f) => f.trim()).filter(Boolean)
    : [];

  // ── Doc filtering ──────────────────────────────────────────────
  const commitDocs = config.workflow?.commitDocs !== false;
  const docPatterns = [/^bp\//, /\.md$/, /^docs\//];
  const isDocFile = (f: string): boolean => docPatterns.some((p) => p.test(f));

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
    const result: CommitResult = {
      ok: true,
      note: `commit_docs is disabled. Skipped doc files: ${skippedDocs.join(', ')}`,
      skipped: skippedDocs,
    };
    // Only warn, don't abort — still commit code files below
  }

  if (codeFiles.length === 0 && allFiles.length > 0) {
    console.log([
      'error: All specified files are doc files and commit_docs is disabled. Nothing to commit.',
      `skipped: ${skippedDocs.join(', ')}`,
    ].join('\n'));
    return;
  }

  // ── Stage files ────────────────────────────────────────────────
  if (codeFiles.length > 0) {
    try {
      execFileSync('git', ['add', ...codeFiles], { cwd });
    } catch {
      console.log(JSON.stringify({ error: 'git add failed' }));
      return;
    }
  }

  // ── Build commit message ───────────────────────────────────────
  const fullMessage = options.scope ? `${message}(${options.scope})` : message;

  // ── Commit (write message to temp file to avoid shell injection) ──
  const msgFile = join(cwd, '.git', 'COMMIT_EDITMSG_TMP');
  writeFileSync(msgFile, fullMessage, 'utf-8');
  try {
    const args = ['commit', '-F', msgFile];
    if (options.amend) args.push('--amend', '--no-edit');
    execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: 'pipe' });
  } catch (err: unknown) {
    const stderr = err instanceof Error ? err.message : String(err);
    const gitOutput = (err as Record<string, unknown>).stdout as string ?? '';
    const gitStderr = (err as Record<string, unknown>).stderr as string ?? '';
    const combined = stderr + gitOutput + gitStderr;
    if (combined.includes('nothing to commit') || combined.includes('nothing added to commit')) {
      // Commit skipped but hash recording should still happen (use HEAD)
      // Fall through to hash/record logic below — do NOT return
    } else {
      console.log(JSON.stringify({ error: 'git commit failed', details: stderr.slice(0, 200) }));
      return;
    }
  }

  // ── Get hash ───────────────────────────────────────────────────
  let hash = '';
  try {
    hash = execSync('git rev-parse --short HEAD', { cwd, encoding: 'utf-8' }).trim();
  } catch { /* non-critical */ }

  // ── Record hash to tasks.md ────────────────────────────────────
  let taskRecorded: CommitResult['taskRecorded'];

  if (options.task && hash) {
    const tasksPath = resolveTasksPath(bpDir, options.tasksPath);
    if (tasksPath) {
      taskRecorded = recordTaskHash(tasksPath, options.task, hash);
    }
  }

  // ── Record to state.md history ─────────────────────────────────
  let stateRecorded = false;
  if (options.record && hash) {
    try {
      const state = loadState(bpDir);
      // Append history entry by saving state (body preserved)
      saveState(bpDir, state);
      stateRecorded = true;
    } catch { /* state not available */ }
  }

  // ── Output ─────────────────────────────────────────────────────
  const result: CommitResult = {
    ok: true,
    message: fullMessage,
    hash: hash || 'unknown',
    files: codeFiles.length,
    skipped: skippedDocs.length > 0 ? skippedDocs : undefined,
    taskRecorded,
    stateRecorded: options.record ? stateRecorded : undefined,
  };

  console.log(JSON.stringify(result, null, 2));
}

// ── Task hash recording ──────────────────────────────────────────

function resolveTasksPath(bpDir: string, explicit?: string): string | null {
  // If caller explicitly provided a path, trust it.
  if (explicit) {
    return resolve(explicit);
  }

  // Auto-detect: search for task files in common locations
  const candidates = [
    join(bpDir, 'changes'),
    join(bpDir, 'milestones'),
    join(bpDir, 'archive'),
  ];
  const filenames = ['tasks.md', 'review-task.md'];

  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    for (const filename of filenames) {
      try {
        const found = findFileRecursive(dir, filename);
        if (found) return found;
      } catch { continue; }
    }
  }

  return null;
}

function findFileRecursive(root: string, target: string): string | null {
  const entries = readdirSync(root, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(root, entry.name);
    if (entry.isDirectory()) {
      const found = findFileRecursive(fullPath, target);
      if (found) return found;
    } else if (entry.isFile() && entry.name === target) {
      return fullPath;
    }
  }
  return null;
}

function recordTaskHash(
  tasksPath: string,
  taskId: string,
  hash: string,
): { task: string; hash: string; path: string } | undefined {
  try {
    if (!existsSync(tasksPath)) {
      console.warn(`⚠ tasks.md not found at: ${tasksPath}. Task hash not recorded.`);
      return undefined;
    }
    let content = readFileSync(tasksPath, 'utf-8');
    // Match task line: "- [x] task-1.1: ...", "- [ ] **task-3-1**: ...", or "- [ ] task-3-1: ..."
    // taskId may be wrapped in ** (bold) in tasks.md
    const taskPattern = new RegExp(
      `^(- \\[[ x]\\] \\*{0,2}${escapeRegex(taskId)}\\*{0,2}[^\\n]*)`,
      'm',
    );
    const match = content.match(taskPattern);

    if (match) {
      const existingLine = match[1];
      // Remove existing commit annotation if any
      const cleaned = existingLine.replace(/<!-- commit: [a-f0-9]+ -->/g, '').trimEnd();
      // Mark task done if not already (match both - [ ] and - [x])
      const checked = cleaned.replace('- [ ]', '- [x]');
      const annotated = `${checked} <!-- commit: ${hash} -->`;
      content = content.replace(existingLine, annotated);
      writeFileSync(tasksPath, content, 'utf-8');
      return { task: taskId, hash, path: tasksPath };
    }
  } catch { /* tasks.md not writable */ }

  return undefined;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
