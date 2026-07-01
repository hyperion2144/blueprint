/**
 * bp ship — ship phase or milestone (create PR, tag release)
 */

import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { loadState, updateState } from '../core/state-file.js';

export function register(program: any): void {
  program
    .command('ship')
    .description('Ship phase (create PR) or milestone (release tag)')
    .option('--dry-run', 'Preview without executing')
    .action(shipHandler);
}

function shipHandler(options: { dryRun?: boolean }) {
  const bpDir = join(process.cwd(), 'bp');
  const state = loadState(bpDir);

  const milestone = state.project.current_milestone;
  const phase = state.project.current_phase;

  console.log(JSON.stringify({
    mode: milestone ? 'milestone' : 'phase',
    milestone: milestone || null,
    phase: phase || null,
    dryRun: options.dryRun || false,
    hint: options.dryRun
      ? 'Dry run complete. Run without --dry-run to execute.'
      : 'Run `bp continue` to proceed after shipping.',
  }));
}
