/**
 * bp plan [name] - dispatch planner sub-agent to produce design.md, tasks.md, and delta specs
 *
 * Also supports `--write-context` for context.jsonl generation from the design
 * and tasks references (used by integration tests and the planner sub-agent's
 * deterministic pre-merge hook).
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { findBpDir } from './_utils.js';
import { buildContextJsonl } from '../core/context-builder.js';
import { getWorkflowInstructions } from '../core/continue.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('plan [name]')
    .description('Dispatch planner sub-agent (produce design, tasks, delta specs)')
    .option('--fix', 'fix mode: read review.md D-issues and redesign')
    .option('--write-context', 'write bp/changes/<name>/context.jsonl from design/task refs and exit')
    .action(planHandler);
}

function planHandler(name: string | undefined, options: { fix?: boolean; writeContext?: boolean }) {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  if (options.writeContext) {
    if (!name) {
      console.error('--write-context requires a change name.');
      process.exit(1);
    }
    writeContextJsonl(bpDir, name);
    return;
  }

  // Output the full workflow instructions from the TypeScript template
  const instructions = getWorkflowInstructions('plan');
  if (instructions) {
    console.log(instructions);
    return;
  }

  if (!name) {
    console.log('No change name provided.');
    console.log('Usage: bp plan <change-name> [--fix]');
    console.log('  Dispatches the planner sub-agent to produce design.md, tasks.md, and delta specs.');
    console.log('  Use --fix to re-plan with review.md D-issue context.');
    return;
  }

  console.log(`Change: ${name}`);
  console.log(`Mode: ${options.fix ? 'fix' : 'normal'}`);
}

function writeContextJsonl(bpDir: string, changeName: string): void {
  const changeDirPath = join(bpDir, 'changes', changeName);
  if (!existsSync(changeDirPath)) {
    console.error(`Change "${changeName}" not found under ${bpDir}/changes/.`);
    process.exit(1);
  }

  const content = buildContextJsonl(bpDir, changeDirPath);
  const outputPath = join(changeDirPath, 'context.jsonl');
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, content, 'utf-8');
  console.log(`context.jsonl written for ${changeName} (${content.split('\n').filter(Boolean).length} rows)`);
}
