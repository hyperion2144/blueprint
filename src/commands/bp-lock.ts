import { Command } from 'commander';
import { existsSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { findBpDir } from './_utils.js';

export function register(program: Command): void {
  program
    .command('lock <change>')
    .description('Lock a change for exclusive editing (multi-orchestrator safety)')
    .option('--user <name>', 'Lock owner name')
    .action(lockHandler);
  program
    .command('unlock <change>')
    .description('Release a change lock')
    .action(unlockHandler);
}

function lockHandler(change: string, options: { user?: string }): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  const lockDir = join(bpDir, 'changes', change, '.meta');
  const lockFile = join(lockDir, '.lock');
  if (existsSync(lockFile)) {
    const lock = JSON.parse(readFileSync(lockFile, 'utf-8'));
    console.error(`Change '${change}' is locked by ${lock.user || 'unknown'} since ${lock.timestamp}.`);
    process.exit(1);
  }
  if (!existsSync(lockDir)) mkdirSync(lockDir, { recursive: true });
  writeFileSync(lockFile, JSON.stringify({ user: options.user || process.env.USER || 'unknown', timestamp: new Date().toISOString() }, null, 2), 'utf-8');
  console.log(`Locked '${change}' for ${options.user || process.env.USER || 'unknown'}.`);
}

function unlockHandler(change: string): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  const lockFile = join(bpDir, 'changes', change, '.meta', '.lock');
  if (!existsSync(lockFile)) { console.log(`Change '${change}' is not locked.`); return; }
  rmSync(lockFile);
  console.log(`Unlocked '${change}'.`);
}
