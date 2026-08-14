/**
 * bp design-shotgun [change-name] — output the design-shotgun workflow step
 * instructions (multi-variant design exploration).
 *
 * The CLI itself never edits files: `design-shotgun` only prints the
 * orchestrator instructions; the exploration work is dispatched to the
 * designer sub-agent.
 */

import { findBpDir } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('design-shotgun [change-name]')
    .description('Output the design-shotgun workflow instructions (multi-variant design exploration)')
    .action((changeName: string | undefined) => designShotgunHandler('design-shotgun', changeName));
}

function designShotgunHandler(step: string, _changeName: string | undefined): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  const instructions = getWorkflowInstructions(step, bpDir);
  if (!instructions) {
    console.error('Design-shotgun workflow instructions not found.');
    process.exit(1);
  }
  console.log(instructions);
}
