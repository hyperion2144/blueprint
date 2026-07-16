/**
 * bp review [name] [--fix] — triple review orchestration
 * Checks code implementation status, outputs workflow instructions
 * for the orchestrator to dispatch a reviewer sub-agent.
 * Does NOT directly dispatch sub-agents itself.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findBpDir } from './_utils.js';
import { loadSchema } from '../core/schema.js';
import { listActiveChanges, changeDir } from '../core/file-tree.js';
import { checkArtifacts } from '../core/continue.js';
import { WORKFLOW_REGISTRY } from '../templates/workflows/registry.js';

export function register(program: any): void {
  program
    .command('review [name]')
    .description('Triple review of a change — outputs dispatch instructions')
    .option('--fix', 'Re-review mode for in-place issue resolution')
    .action(reviewHandler);
}

function reviewHandler(name: string | undefined, options: { fix?: boolean }): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  const changeName = resolveChangeName(bpDir, name);
  if (!changeName) process.exit(1);

  const changeDirPath = changeDir(bpDir, changeName);
  if (!existsSync(changeDirPath)) {
    console.error(`Change "${changeName}" not found.`);
    process.exit(1);
  }

  // Check that code is fully implemented (all tasks [x])
  const schema = loadSchema(bpDir);
  const artifacts = checkArtifacts(bpDir, changeName, schema);
  if (!artifacts.allTasksDone) {
    console.log(
      `\nCode is not fully implemented. Tasks: ${artifacts.tasksCompleted}/${artifacts.tasksTotal} complete.`,
    );
    console.log('Run "bp apply" to execute remaining tasks before review.');
    process.exit(1);
  }

  // Output workflow instructions from registry
  const reviewTemplate = WORKFLOW_REGISTRY.review.command();

  console.log(`\nChange: ${changeName}`);
  if (options.fix) {
    console.log('\nMode: --fix (re-review)');
    console.log('Reviewer will mark resolved issues in existing review.md and add new findings.\n');
  }

  console.log('--- Review Workflow Instructions ---');
  console.log('');
  console.log(reviewTemplate.content);
}

function resolveChangeName(bpDir: string, name?: string): string | null {
  if (name) return name;

  const active = listActiveChanges(bpDir);
  if (active.length === 0) {
    console.error('No active changes found.');
    return null;
  }
  if (active.length === 1) return active[0];

  console.log('Multiple active changes:');
  for (const c of active) {
    console.log(`  - ${c}`);
  }
  console.log('\nSpecify a change: bp review <name>');
  return null;
}
