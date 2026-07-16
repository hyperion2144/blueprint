/**
 * bp apply [name] — dispatch executor sub-agents per wave for parallel implementation
 *
 * Full instructions: see DESIGN-v2/workflows/apply.md
 */

import { findBpDir } from './_utils.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('apply [name]')
    .description('Dispatch executor sub-agents (implement tasks per wave)')
    .option('--fix', 'fix mode: read review.md R/Q/G issues and fix')
    .action(applyHandler);
}

function applyHandler(name: string | undefined, options: { fix?: boolean }) {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  console.log('Workflow: apply');
  console.log('See DESIGN-v2/workflows/apply.md for full instructions.');
  console.log('');

  if (!name) {
    console.log('No change name provided.');
    console.log('Usage: bp apply <change-name> [--fix]');
    console.log('  Dispatches executor sub-agents per wave to implement tasks.');
    console.log('  Use --fix to re-apply with review.md R/Q/G issue context.');
    return;
  }

  const fixMode = options.fix ? ' --fix' : '';
  console.log(`Change: ${name}`);
  console.log(`Mode: ${options.fix ? 'fix' : 'normal'}`);
  console.log(`\nDispatch executor sub-agents per wave for change "${name}":\n`);
  console.log(`  1. Read bp/changes/${name}/tasks.md and identify waves`);
  console.log(`  2. For each wave: dispatch executor sub-agent (isolated)`);
  console.log(`  3. After each wave: verify git log, tests, task marking`);
  console.log(`  4. Run full test suite after all waves complete`);
  console.log(`\n  Then run: bp review ${name}${fixMode}`);
}
