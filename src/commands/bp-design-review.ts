/**
 * bp design-review [change-name] — output the design-review workflow step
 * instructions (designer's-eye QA audit against DESIGN.md).
 *
 * The CLI itself never edits files: `design-review` only prints the
 * orchestrator instructions; the audit work is dispatched to the designer
 * sub-agent.
 */

import { findBpDir } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('design-review [change-name]')
    .description("Output the design-review workflow instructions (visual and UX audit against DESIGN.md)")
    .action((changeName: string | undefined) => designReviewHandler('design-review', changeName));
}

function designReviewHandler(step: string, _changeName: string | undefined): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  const instructions = getWorkflowInstructions(step, bpDir);
  if (!instructions) {
    console.error('Design-review workflow instructions not found.');
    process.exit(1);
  }
  console.log(instructions);
}
