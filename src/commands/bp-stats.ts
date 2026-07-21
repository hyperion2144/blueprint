import { Command } from 'commander';
import { findBpDir } from './_utils.js';
import { readAllMeta, summarizeMeta } from '../core/meta.js';
import { listActiveChanges } from '../core/file-tree.js';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

export function register(program: Command): void {
  program
    .command('stats [change]')
    .description('Show execution statistics for a change or project summary')
    .option('--json', 'Output as JSON')
    .action(statsHandler);
}

function statsHandler(change: string | undefined, options: { json?: boolean }): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }

  if (change) {
    const summary = summarizeMeta(bpDir, change);
    if (options.json) { console.log(JSON.stringify(summary, null, 2)); return; }
    const s = summary as Record<string, unknown>;
    console.log(`Change: ${change}`);
    console.log(`  Total runs: ${s.total_runs}`);
    console.log(`  Review rounds: ${s.review_rounds}`);
    console.log(`  Executor waves: ${s.executor_waves}`);
    console.log(`  Total issues found: ${s.total_issues}`);
    console.log(`  Final verdict: ${s.final_verdict}`);
  } else {
    const changes = listActiveChanges(bpDir);
    const archiveDir = join(bpDir, 'changes', 'archive');
    const archived = existsSync(archiveDir) ? readdirSync(archiveDir) : [];
    console.log('Project Statistics:');
    console.log(`  Active changes: ${changes.length}`);
    console.log(`  Archived changes: ${archived.length}`);
    let totalRuns = 0;
    for (const c of changes) {
      const meta = readAllMeta(bpDir, c);
      totalRuns += meta.length;
    }
    console.log(`  Total sub-agent runs (active): ${totalRuns}`);
  }
}
