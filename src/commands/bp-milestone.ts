/**
 * bp milestone archive <id> — archive a completed milestone.
 */

import { join } from 'node:path';
import { existsSync, readdirSync, mkdirSync, copyFileSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { loadState, saveState } from '../core/state-file.js';
import { execSync } from 'node:child_process';

export function register(program: any): void {
  const cmd = program.command('milestone').description('Milestone management (archive)');
  cmd.command('archive <id>').description('Archive a completed milestone').action(archiveHandler);
}

function archiveHandler(id: string): void {
  const bpDir = join(process.cwd(), 'bp');
  const sourceDir = join(bpDir, 'milestones', id);
  const archiveDir = join(bpDir, 'archive', 'milestones', id);

  if (!existsSync(sourceDir)) {
    console.log(JSON.stringify({ error: 'Milestone "' + id + '" not found at ' + sourceDir }));
    return;
  }

  if (existsSync(archiveDir)) {
    console.log(JSON.stringify({ error: 'Archive destination already exists: ' + archiveDir + '. Manual resolution required.' }));
    return;
  }

  // Copy then remove (safe across devices)
  copyDirRecursive(sourceDir, archiveDir);
  rmSync(sourceDir, { recursive: true, force: true });

  // Update git
  try {
    execSync(`git rm -r "bp/milestones/${id}" || true`, { cwd: process.cwd() });
  } catch { /* non-critical */ }

  // Record in state.md history
  const state = loadState(bpDir);
  const date = new Date().toISOString().slice(0, 10);
  const entry = `- [${date}] Archived milestone \`${id}\``;

  try {
    const statePath = join(bpDir, 'state.md');
    let text = readFileSync(statePath, 'utf-8');
    if (!text.includes('## History')) {
      text += `\n\n## History\n${entry}\n`;
    } else {
      text = text.replace('## History\n', `## History\n${entry}\n`);
    }
    writeFileSync(statePath, text, 'utf-8');

    // Clear archived milestone from current state
    state.project.current_milestone = null;
    state.project.current_phase = null;
    state.active_context = { type: 'project', ref: null, step: 'milestone-shipped' };
    state.project.status = 'milestone-shipped';
    saveState(bpDir, state);
  } catch { /* non-critical */ }

  console.log(JSON.stringify({ ok: true, archived: archiveDir }));
}

function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}
