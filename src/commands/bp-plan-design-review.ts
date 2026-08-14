/**
 * bp plan-design-review [change-name] — output the plan-design-review
 * workflow step instructions (plan-phase UI audit).
 *
 * The CLI itself never edits files: `plan-design-review` only prints the
 * orchestrator instructions; the audit work is dispatched to the designer
 * sub-agent. The audit is advisory — it never gates `bp plan`.
 */

import { findBpDir } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('plan-design-review [change-name]')
    .description('Output the plan-design-review workflow instructions (plan-phase UI audit)')
    .action((changeName: string | undefined) => planDesignReviewHandler('plan-design-review', changeName));
}

function planDesignReviewHandler(step: string, _changeName: string | undefined): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  const instructions = getWorkflowInstructions(step, bpDir);
  if (!instructions) {
    console.error('Plan-design-review workflow instructions not found.');
    process.exit(1);
  }
  console.log(instructions);
}
