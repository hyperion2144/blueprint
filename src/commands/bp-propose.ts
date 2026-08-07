/**
 * bp propose <name> -- output workflow instructions for orchestrator
 *
 * Follows the same pattern as bp-plan, bp-apply, bp-check:
 * validate state, then output workflow instructions for the agent.
 * Does NOT create directories or write files — the orchestrator agent does that.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findBpDir } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('propose [name]')
    .description('Output propose workflow instructions — orchestrator discusses and writes proposal')
    .option('--phase <milestone>/<phase>', 'reference a roadmap phase')
    .action(proposeHandler);
}

function proposeHandler(name: string | undefined, _options: { phase?: string }) {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  // If name provided, warn if change already exists (but don't block — agent handles it)
  if (name) {
    const changeDir = join(bpDir, 'changes', name);
    if (existsSync(changeDir)) {
      console.error(`Change already exists: ${name}`);
      process.exit(1);
    }
  }

  const instructions = getWorkflowInstructions('propose');
  if (instructions) {
    console.log(instructions);
    return;
  }

  console.error('Propose workflow instructions not found.');
  process.exit(1);
}
