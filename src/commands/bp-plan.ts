/**
 * bp plan [name] - dispatch planner sub-agent to produce design.md, tasks.md, and delta specs
 */

import { findBpDir } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
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

  // Output the full workflow instructions from the TypeScript template
  const instructions = getWorkflowInstructions('plan');
  if (instructions) {
    console.log(instructions);
    return;
  }

  if (!name) {
    console.log('No change name provided.');
    console.log('Usage: bp plan <change-name> [--fix]');
    console.log('  Dispatches the planner sub-agent to produce design.md, tasks.md, and delta specs.');
    console.log('  Use --fix to re-plan with review.md D-issue context.');
    return;
  }

  console.log(`Change: ${name}`);
  console.log(`Mode: ${options.fix ? 'fix' : 'normal'}`);
}
