/**
 * bp apply [name] - dispatch executor sub-agents per wave for parallel implementation
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findBpDir, gateContextJsonl, gatePlaceholders } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
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

  if (name && !gateContextJsonl(bpDir, name, 'apply')) {
    process.exit(2);
  }
  if (name && !gatePlaceholders(bpDir, name, ['design.md', 'tasks.md'])) process.exit(1);

  // Output the full workflow instructions from the TypeScript template
  const instructions = getWorkflowInstructions('apply');
  if (instructions) {
    console.log(instructions);
    return;
  }

  if (!name) {
    console.log('No change name provided.');
    console.log('Usage: bp apply <change-name> [--fix]');
    console.log('  Dispatches executor sub-agents per wave to implement tasks.');
    console.log('  Use --fix to re-apply with review.md R/Q/G issue context.');
    return;
  }

  console.log(`Change: ${name}`);
  console.log(`Mode: ${options.fix ? 'fix' : 'normal'}`);
}

