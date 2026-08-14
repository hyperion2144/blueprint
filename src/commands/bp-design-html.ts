/**
 * bp design-html [change-name] — output the design-html workflow step
 * instructions (DESIGN.md to production HTML/CSS).
 *
 * The CLI itself never edits files: `design-html` only prints the
 * orchestrator instructions; the generation work is dispatched to the
 * designer sub-agent.
 */

import { findBpDir } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('design-html [change-name]')
    .description('Output the design-html workflow instructions (DESIGN.md to production HTML/CSS)')
    .action((changeName: string | undefined) => designHtmlHandler('design-html', changeName));
}

function designHtmlHandler(step: string, _changeName: string | undefined): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  const instructions = getWorkflowInstructions(step, bpDir);
  if (!instructions) {
    console.error('Design-html workflow instructions not found.');
    process.exit(1);
  }
  console.log(instructions);
}
