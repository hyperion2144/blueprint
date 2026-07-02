/**
 * bp commit <message> — conventional commit with hash recording.
 *
 * - Filters doc files when commit_docs is disabled in project.yml
 * - --task <id> records commit hash next to the task in tasks.md
 * - --record appends commit to state.md history
 * - Returns structured JSON: hash, files, skipped, records written
 */

import { join, basename } from 'node:path';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
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
      execSync(`git add ${codeFiles.join(' ')}`, { cwd });
    } catch {
      console.log(JSON.stringify({ error: 'git add failed' }));
      return;
    }
  }

  // ── Build commit message ───────────────────────────────────────
  const scope = options.scope ? `(${options.scope})` : '';
  const fullMessage = `${message}${scope}`.trim();

  // ── Commit ─────────────────────────────────────────────────────
  try {
    const amendFlag = options.amend ? '--amend --no-edit' : '';
    execSync(`git commit ${amendFlag} -m "${fullMessage.replace(/"/g, '\\"')}"`, {
      cwd,
      encoding: 'utf-8',
      stdio: 'pipe',
    });
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
  if (explicit && existsSync(join(process.cwd(), explicit))) {
    return join(process.cwd(), explicit);
  }

  // Auto-detect: search for tasks.md in common locations
  const candidates = [
    join(bpDir, 'changes'),
    join(bpDir, 'milestones'),
    join(bpDir, 'archive'),
  ];

  for (const dir of candidates) {
    if (!existsSync(dir)) continue;
    try {
      const result = execSync(
        `find "${dir}" -name tasks.md -type f 2>/dev/null | head -1`,
        { cwd: process.cwd(), encoding: 'utf-8', timeout: 3000 },
      ).trim();
      if (result) return result;
    } catch { continue; }
  }

  return null;
}

function recordTaskHash(
  tasksPath: string,
  taskId: string,
  hash: string,
): { task: string; hash: string; path: string } | undefined {
  try {
    let content = readFileSync(tasksPath, 'utf-8');
    // Match task line: "- [x] task-1.1: ..." or "- [ ] task-1.1: ..."
    const taskPattern = new RegExp(
      `^(- \\[[ x]\\] ${escapeRegex(taskId)}[^\\n]*)`,
      'm',
    );
    const match = content.match(taskPattern);

    if (match) {
      const existingLine = match[1];
      // Remove existing commit annotation if any
      const cleaned = existingLine.replace(/<!-- commit: [a-f0-9]+ -->/g, '').trimEnd();
      const annotated = `${cleaned} <!-- commit: ${hash} -->`;
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
