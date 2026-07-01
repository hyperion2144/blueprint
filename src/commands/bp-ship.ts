/**
 * bp ship — ship phase or milestone.
 * Phase ship: generates summary from archived changes, writes to phase dir.
 * Milestone ship: creates release tag, updates version.
 */

import { join, basename } from 'node:path';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadState, updateState } from '../core/state-file.js';

export function register(program: any): void {
  program
    .command('ship')
    .description('Ship phase (summary + state update) or milestone (release tag)')
    .option('--dry-run', 'Preview without executing')
    .action(shipHandler);
}

function shipHandler(options: { dryRun?: boolean }) {
  const cwd = process.cwd();
  const bpDir = join(cwd, 'bp');
  const state = loadState(bpDir);

  const milestone = state.project.current_milestone;
  const phase = state.project.current_phase;

  if (!milestone || !phase) {
    console.log(JSON.stringify({ error: 'No active milestone/phase. Nothing to ship.' }));
    return;
  }

  const archiveRoot = join(bpDir, 'archive', milestone, phase);
  const changes = findArchivedChanges(archiveRoot);

  if (options.dryRun) {
    console.log(JSON.stringify({
      mode: 'phase',
      milestone,
      phase,
      changes: changes.map((c) => c.name),
      dryRun: true,
      hint: 'Dry run complete. Run without --dry-run to execute.',
    }));
    return;
  }

  // Generate phase summary
  const summary = generatePhaseSummary(milestone, phase, changes, bpDir);
  const phaseDir = join(bpDir, 'milestones', milestone, 'phases', phase);
  mkdirSync(phaseDir, { recursive: true });
  writeFileSync(join(phaseDir, 'summary.md'), summary, 'utf-8');

  // Update state
  updateState(bpDir, (s) => {
    s.project.status = 'phase-shipped';
  });

  console.log(JSON.stringify({
    ok: true,
    mode: 'phase',
    milestone,
    phase,
    changes: changes.length,
    summary: `bp/milestones/${milestone}/phases/${phase}/summary.md`,
    hint: 'Phase shipped. Run `bp state set-phase <next-id>` then `bp continue` to start next phase.',
  }));
}

function findArchivedChanges(dir: string): { name: string; path: string }[] {
  if (!existsSync(dir)) return [];
  const results: { name: string; path: string }[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      results.push({ name: entry.name, path: join(dir, entry.name) });
    }
  }
  return results;
}

function generatePhaseSummary(
  milestone: string,
  phase: string,
  changes: { name: string; path: string }[],
  bpDir: string,
): string {
  const lines: string[] = [
    `# Phase Summary: ${phase}`,
    `> Milestone: ${milestone}`,
    `> Date: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `## Changes (${changes.length})`,
    '',
  ];

  for (const ch of changes) {
    const summaryPath = join(ch.path, 'change-summary.md');
    const tasksPath = join(ch.path, 'tasks.md');
    lines.push(`### ${ch.name}`);
    lines.push('');

    if (existsSync(summaryPath)) {
      const content = readFileSync(summaryPath, 'utf-8');
      lines.push(content.slice(0, 500));
      if (content.length > 500) lines.push('...');
    } else {
      lines.push('_(no change summary)_');
    }
    lines.push('');
  }

  return lines.join('\n');
}
