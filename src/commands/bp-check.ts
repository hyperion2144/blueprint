/**
 * bp check [name] [--ci] — triple check orchestration
 * Checks code implementation status, outputs workflow instructions
 * for the orchestrator to dispatch a reviewer sub-agent (full triple
 * review) and, on a non-PASS verdict, the fixer for a full re-review.
 * Does NOT directly dispatch sub-agents itself.
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { findBpDir, gateContextJsonl, resolveChangeName, gatePlaceholders } from './_utils.js';
import { loadSchema } from '../core/schema.js';
import { changeDir } from '../core/file-tree.js';
import { checkArtifacts } from '../core/continue.js';
import type { Command } from 'commander';
import { WORKFLOW_REGISTRY } from '../templates/workflows/registry.js';

export function register(program: Command): void {
  program
    .command('check [name]')
    .description('Triple check of a change -- full verify + fixer loopback + full re-review')
    .option('--ci', 'CI mode: non-interactive, FAIL exits 1 immediately')
    .action(checkHandler);
}

function checkHandler(name: string | undefined, options: { ci?: boolean }): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  if (options.ci && !name) {
    // In CI mode, resolveChangeName must have a definitive result.
    // If name is undefined and multiple changes exist, resolveChangeName
    // already printed an error — exit 1 for CI determinism.
    const resolved = resolveChangeName(bpDir, name);
    if (!resolved) process.exit(1);
  }

  const changeName = resolveChangeName(bpDir, name);
  if (!changeName) process.exit(1);

  const changeDirPath = changeDir(bpDir, changeName);
  if (!existsSync(changeDirPath)) {
    console.error(`Change "${changeName}" not found.`);
    process.exit(1);
  }
  if (!gateContextJsonl(bpDir, changeName, 'check')) process.exit(2);
  if (!gatePlaceholders(bpDir, changeName, ['tasks.md'])) process.exit(1);

  // Check that code is fully implemented (all tasks [x])
  const schema = loadSchema(bpDir);
  const artifacts = checkArtifacts(bpDir, changeName, schema);
  if (!artifacts.allTasksDone) {
    if (artifacts.tasksCompleted < artifacts.tasksTotal) {
      console.log(`\nTasks not fully implemented: ${artifacts.tasksCompleted}/${artifacts.tasksTotal} tasks complete.`);
      console.log('Run "bp apply" to execute remaining tasks before check.');
    } else {
      console.log(`\nPre-Archive Checklist incomplete: ${artifacts.checklistCompleted}/${artifacts.checklistTotal} items checked.`);
      console.log('Run build/tests, then mark checklist items [x] in tasks.md. Do NOT re-dispatch executor.');
    }
    process.exit(1);
  }

  // Output workflow instructions from registry
  const checkTemplate = WORKFLOW_REGISTRY.check.command();

  console.log(`\nChange: ${changeName}`);
  if (options.ci) {
    console.log('\nCI MODE: no human confirmation. If review verdict is not PASS, exit 1 immediately.');
  }
  console.log('--- Check Workflow Instructions ---');
  console.log('');
  console.log(checkTemplate.content);
}
