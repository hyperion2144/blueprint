/**
 * bp design [change-name] — output the design workflow step instructions
 * (design-system consultation -> root DESIGN.md).
 *
 * The CLI itself never edits files: `design` only prints the orchestrator
 * instructions; the design work is dispatched to the designer sub-agent.
 */

import { findBpDir } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('design [change-name]')
    .description('Output the design workflow instructions (design-system consultation -> root DESIGN.md)')
    .action((changeName: string | undefined) => designHandler('design', changeName));
}

function designHandler(step: string, _changeName: string | undefined): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  const instructions = getWorkflowInstructions(step, bpDir);
  if (!instructions) {
    console.error('Design workflow instructions not found.');
    process.exit(1);
  }
  console.log(instructions);
}
