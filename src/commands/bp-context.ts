/**
 * bp context <step> — generate the AI context prompt for a given workflow step.
 *
 * Produces a structured context prompt containing specs, conventions, rules,
 * and active change info for the given workflow step (plan / apply / review / archive).
 *
 * Formats: full (terminal-friendly), compact (tagged XML block), json (structured data).
 */

import { type Command } from 'commander';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { generateContext, formatContextTerminal, generateCompactContext, formatContextCompact, formatContextCompactJson } from '../core/spec-injector.js';

export function register(program: Command): void {
  program
    .command('context <step>')
    .description('Generate AI context prompt for a workflow step')
    .option('--format <format>', 'Output format: full, compact, or json', 'full')
    .option('--change <name>', 'Change name to scope context')
    .option('--dir <path>', 'bp/ directory path', 'bp')
    .action(contextHandler);
}

function contextHandler(
  step: string,
  options: { format: string; change?: string; dir: string },
): void {
  const bpDir = resolveBpDir(options.dir);
  const format = options.format;

  if (!['full', 'compact', 'json'].includes(format)) {
    console.error(`[bp context] Invalid format '${format}'. Use full, compact, or json.`);
    process.exit(1);
  }

  if (!existsSync(join(bpDir, 'config.yaml'))) {
    console.error(`[bp context] bp/config.yaml not found. Run "bp init" first.`);
    process.exit(1);
  }

  if (options.change && !existsSync(join(bpDir, 'changes', options.change))) {
    console.error(`[bp context] Change '${options.change}' not found under bp/changes/.`);
    process.exit(1);
  }

  if (format === 'full') {
    const ctx = generateContext(bpDir, step, options.change);
    console.log(formatContextTerminal(ctx));
  } else if (format === 'compact') {
    const ctx = generateCompactContext(bpDir, { step });
    console.log(formatContextCompact(ctx));
  } else if (format === 'json') {
    const ctx = generateCompactContext(bpDir, { step });
    console.log(formatContextCompactJson(ctx));
  }
}

function resolveBpDir(dirOption: string): string {
  return dirOption.startsWith('/') ? dirOption : join(process.cwd(), dirOption);
}
