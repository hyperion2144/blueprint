import type { Command } from 'commander';

/**
 * bp continue [name] - schema-driven next step detection.
 *
 * Outputs the NEXT STEP'S WORKFLOW INSTRUCTIONS directly, not a command reference.
 * The user runs `bp continue` and gets the complete instructions for what to do.
 */

import { determineNextStepForChange } from '../core/continue.js';
import { findBpDir } from './_utils.js';

export function register(program: Command): void {
  program
    .command('continue [name]')
    .description('Detect next step and output its workflow instructions')
    .action(continueHandler);
}

function continueHandler(name?: string) {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  const result = determineNextStepForChange(bpDir, name);

  if (result.activeChanges.length > 1) {
    console.log('Multiple active changes:');
    for (const c of result.activeChanges) {
      console.log(`  - ${c}`);
    }
    console.log('\nSpecify a change: bp continue <name>');
    return;
  }

  // Output the next step's workflow instructions directly
  if (result.nextStep) {
    // Always output description first (may contain [INCOMPLETE] warnings)
    if (result.nextStep.description) {
      console.log(result.nextStep.description);
      console.log('');
    }
    if (result.nextStep.instructions) {
      console.log(result.nextStep.instructions);
    } else {
      console.log(`Run: ${result.nextStep.command}`);
    }
    return;
  }

  // Fallback: show progress for a known change without a next step
  if (result.changeName && result.progress) {
    const p = result.progress;
    console.log(`Change: ${result.changeName}`);
    console.log(`Artifacts: proposal=${p.artifacts.proposal} design=${p.artifacts.design} tasks=${p.artifacts.tasks}(${p.artifacts.tasksCompleted}/${p.artifacts.tasksTotal}) specs=${p.artifacts.specs} review=${p.artifacts.review}`);
    console.log(`Status: ${p.stage}`);
  }
}
