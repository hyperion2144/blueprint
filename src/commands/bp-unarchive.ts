/**
 * bp unarchive <name> — restore an archived change back to active
 *
 * Moves a change directory from bp/changes/archive/<name> back to
 * bp/changes/<name>. The delta spec merge is NOT reversed — the user
 * must manually reconcile bp/specs/ afterward.
 */

import { existsSync, readdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { findBpDir } from './_utils.js';
import { archiveChangeDir } from '../core/file-tree.js';
import type { Command } from 'commander';

export function register(program: Command): void {
  program
    .command('unarchive <name>')
    .description('Restore an archived change back to active (delta spec merge must be reverted manually)')
    .action(unarchiveHandler);
}

function unarchiveHandler(name: string): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  const archiveDir = join(bpDir, 'changes', 'archive');
  if (!existsSync(archiveDir)) {
    console.error('No archive directory found.');
    process.exit(1);
  }

  // Match exact name or date-prefixed entry
  const entries = readdirSync(archiveDir);
  const match = entries.find((e) => e === name || e.endsWith('-' + name));
  if (!match) {
    console.error(`Archived change "${name}" not found in ${archiveDir}`);
    console.error('Available: ' + entries.join(', '));
    process.exit(1);
  }

  // Compute target name: strip date prefix if present
  const restoredName = match.includes('-') ? match.slice(match.indexOf('-') + 1) : match;
  const archivedPath = join(archiveDir, match);
  const restoredPath = join(bpDir, 'changes', restoredName);

  // Move the directory back
  renameSync(archivedPath, restoredPath);

  console.log(`Restored change to bp/changes/${restoredName}/`);
  console.log('');
  console.log('WARNING: global specs in bp/specs/ were modified during archive.');
  console.log('To fully revert, you must manually undo the delta spec merge:');
  console.log('  - Remove ADDED requirements that came from this change');
  console.log('  - Restore REMOVED requirements');
  console.log('  - Revert MODIFIED requirements to their pre-archive state');
  console.log('  Or use: git revert <archive-commit-hash>');
  console.log('');
  console.log('Next: bp continue ' + restoredName);
}
