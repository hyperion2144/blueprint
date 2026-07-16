/**
 * bp continue [name] - artifact-based progress detection
 * Checks which artifacts exist and recommends the next step.
 */

import { determineNextStepForChange } from '../core/continue.js';
import { findBpDir } from './_utils.js';

export function register(program: any): void {
  program
    .command('continue [name]')
    .description('Check progress and suggest next step')
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
    console.log('\nMultiple active changes:');
    for (const c of result.activeChanges) {
      console.log(`  - ${c}`);
    }
    console.log('\nSpecify a change: bp continue <name>');
    return;
  }

  if (!result.changeName) {
    if (result.nextStep) {
      console.log(`\n${result.nextStep.description}`);
      console.log(`\n  Run: ${result.nextStep.command}`);
    }
    return;
  }

  const { progress, nextStep } = result;

  console.log(`\nChange: ${result.changeName}`);
  console.log('\nArtifacts:');
  console.log(`  proposal.md  ${progress?.artifacts.proposal ? '✓' : '✗'}`);
  console.log(`  design.md     ${progress?.artifacts.design ? '✓' : '✗'}`);
  console.log(`  tasks.md      ${progress?.artifacts.tasks ? '✓' : '✗'}${progress?.artifacts.tasks ? ` (${progress.artifacts.tasksCompleted}/${progress.artifacts.tasksTotal} complete)` : ''}`);
  console.log(`  specs/        ${progress?.artifacts.specs ? '✓' : '✗'}`);
  console.log(`  review.md     ${progress?.artifacts.review ? '✓' : '✗'}${progress?.reviewVerdict ? ` (verdict: ${progress.reviewVerdict})` : ''}`);

  if (progress?.unresolvedIssues) {
    console.log(`  unresolved issues: ${progress.unresolvedIssues}${progress.hasDesignIssues ? ' (includes D-prefixed design issues)' : ''}`);
  }

  console.log(`\nStatus: ${progress?.stage ?? 'unknown'}`);

  if (nextStep) {
    console.log(`Next: ${nextStep.description}`);
    console.log(`\n  Run: bp ${nextStep.command}`);

    // Output workflow instructions if available
    if (nextStep.instructions) {
      console.log('\n--- Workflow Instructions ---\n');
      console.log(nextStep.instructions);
    }
  }
}
