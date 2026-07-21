import { Command } from 'commander';
import { findBpDir } from './_utils.js';

export function register(program: Command): void {
  const spec = program.command('spec').description('Manage bp/specs/ directory');
  spec
    .command('refresh [domain]')
    .description('Re-scan codebase and update bp/specs/ (brownfield maintenance)')
    .option('--apply', 'Write changes to spec files (default: dry-run, just show diff)')
    .action(refreshHandler);
}

function refreshHandler(domain: string | undefined, options: { apply?: boolean } = {}): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  // Output instructions for orchestrator to dispatch codebase-scanner
  console.log('## Spec Refresh');
  console.log('');
  console.log(`Domain: ${domain ?? 'all'}`);
  console.log(`Mode: ${options.apply ? 'apply' : 'dry-run'}`);
  console.log('');
  console.log('Dispatch codebase-scanner sub-agent to re-scan source code and compare with existing bp/specs/.');
  console.log('If --apply: write updated specs. If dry-run: output diff only.');
}
