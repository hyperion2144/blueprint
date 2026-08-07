/**
 * bp refactor [target] — output the refactor workflow step instructions.
 * bp refactor analyze <target> — run the deterministic analyzer, write
 * bp/.refactor-report.md, and print a one-line summary.
 *
 * The CLI itself never edits source code: `refactor` only prints the
 * orchestrator instructions, `refactor analyze` only writes the report
 * artifact (plus a refreshed codebase map when stale).
 */

import { findBpDir } from './_utils.js';
import { getWorkflowInstructions } from '../core/continue.js';
import { getRefactorThresholds, loadConfig } from '../core/config.js';
import { generateCodebaseMap, isMapStale, loadMap, writeCodebaseMap } from '../core/codebase-map.js';
import { runRefactorAnalyzer, writeRefactorReport } from '../core/refactor-analyzer.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  const refactor = program
    .command('refactor [target]')
    .description('Output refactor workflow instructions — or run the deterministic analyzer via "refactor analyze <target>"')
    .option('--change <name>', 'change name passed through to bp dispatch refactorer')
    .option('--format <full|short>', 'output format: full prints the whole workflow, short prints only the first step', 'full')
    .action(refactorHandler);

  refactor
    .command('analyze <target>')
    .description('Run the deterministic refactor analyzer and write bp/.refactor-report.md')
    .action(analyzeHandler);
}

function refactorHandler(target: string | undefined, options: { change?: string; format?: string }): void {
  if (!target) {
    console.error('Usage: bp refactor <target> [--change <name>]');
    process.exit(1);
  }
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }
  const instructions = getWorkflowInstructions('refactor', bpDir);
  if (!instructions) {
    console.error('Refactor workflow instructions not found.');
    process.exit(1);
  }
  console.log(options.format === 'short' ? firstStep(instructions) : instructions);
}

/** `--format short` → print only the `### Step 1:` section (up to `### Step 2:`). */
function firstStep(instructions: string): string {
  const step1 = instructions.indexOf('### Step 1:');
  const step2 = instructions.indexOf('### Step 2:');
  if (step1 === -1 || step2 === -1 || step2 <= step1) return instructions;
  return instructions.slice(step1, step2).replace(/\s+$/, '');
}

function analyzeHandler(target: string): void {
  if (!target) {
    console.error('Usage: bp refactor analyze <target>');
    process.exit(1);
  }
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  let config;
  try {
    config = loadConfig(bpDir);
  } catch (err) {
    console.error(`Config error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  // Reuse the on-disk map when fresh; otherwise rebuild + persist it.
  const rootDir = process.cwd();
  let map = loadMap(bpDir);
  if (!map || isMapStale(bpDir, rootDir)) {
    map = generateCodebaseMap(rootDir);
    writeCodebaseMap(bpDir, map);
  }

  let result;
  try {
    result = runRefactorAnalyzer({
      rootDir,
      target,
      thresholds: getRefactorThresholds(config),
      map,
    });
  } catch (err) {
    console.error(`Analyzer error: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  try {
    writeRefactorReport(bpDir, result.report);
  } catch (err) {
    console.error(`Failed to write bp/.refactor-report.md: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }

  console.log(result.summary);
}
