import { Command } from 'commander';
import { findBpDir } from './_utils.js';

export function register(program: Command): void {
  program
    .command('split <source> <target>')
    .description('Split PRs from one change into a new change')
    .option('--prs <ids...>', 'PR IDs to move (e.g. PR-3 PR-4 PR-5)')
    .action(splitHandler);
}

function splitHandler(source: string, target: string, options: { prs?: string[] } = {}): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  console.log('## Split Change');
  console.log(`Source: ${source}`);
  console.log(`Target: ${target}`);
  console.log(`PRs: ${options.prs?.join(', ') ?? 'none'}`);
  console.log('');
  console.log('Extract specified PR-N and their associated DS-N, T-N from source change.');
  console.log('Create new change directory with extracted artifacts.');
  console.log('Remove extracted items from source change.');
}
