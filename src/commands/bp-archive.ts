/**
 * bp archive [name] — Output archive workflow steps (run bp finalize to execute)
 *
 * This command outputs instructions for the orchestrator to follow.
 * Actual archive execution is handled by `bp finalize`.
 */

import { findBpDir, gateContextJsonl, resolveChangeName, gatePlaceholders } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('archive [name]')
    .description('Output archive workflow steps (run bp finalize to execute)')
    .option('--ci', 'CI mode hint')
    .action(archiveHandler);
}

function archiveHandler(name: string | undefined, options: { ci?: boolean }): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  const changeName = resolveChangeName(bpDir, name);
  if (!changeName) process.exit(1);
  if (!gateContextJsonl(bpDir, changeName, 'archive')) process.exit(2);
  if (!gatePlaceholders(bpDir, changeName, ['review.md'])) process.exit(1);
  const instructions = getWorkflowInstructions('archive');
  if (instructions) {
    console.log(instructions);
    return;
  }
}
