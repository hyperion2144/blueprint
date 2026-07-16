/**
 * bp plan [name] — dispatch planner sub-agent to produce design.md, tasks.md, and delta specs
 *
 * Full instructions: see DESIGN-v2/workflows/plan.md
 */

import { findBpDir } from './_utils.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('plan [name]')
    .description('Dispatch planner sub-agent (produce design, tasks, delta specs)')
    .option('--fix', 'fix mode: read review.md D-issues and redesign')
    .action(planHandler);
}

function planHandler(name: string | undefined, options: { fix?: boolean }) {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  console.log('Workflow: plan');
  console.log('See DESIGN-v2/workflows/plan.md for full instructions.');
  console.log('');

  if (!name) {
    console.log('No change name provided.');
    console.log('Usage: bp plan <change-name> [--fix]');
    console.log('  Dispatches the planner sub-agent to produce design.md, tasks.md, and delta specs.');
    console.log('  Use --fix to re-plan with review.md D-issue context.');
    return;
  }

  const fixMode = options.fix ? ' --fix' : '';
  console.log(`Change: ${name}`);
  console.log(`Mode: ${options.fix ? 'fix' : 'normal'}`);
  console.log(`\nDispatch the planner sub-agent for change "${name}":\n`);
  console.log(`  1. Read bp/changes/${name}/proposal.md`);
  console.log(`  2. Read bp/specs/<domain>/spec.md for each affected domain`);
  console.log(`  3. Read bp/conventions/coding.md and bp/config.yaml`);
  console.log(`  4. Produce: design.md, tasks.md, specs/<domain>/spec.md`);
  console.log(`\n  Then run: bp apply ${name}${fixMode}`);
}
