import type { Command } from 'commander';

/**
 * bp list — list active changes, archived changes, and spec domains
 */

import { join } from 'node:path';
import { listActiveChanges, listArchivedChanges, listSpecDomains } from '../core/file-tree.js';
import { findBpDir } from './_utils.js';

export function register(program: Command): void {
  program
    .command('list')
    .description('List active/archived changes and spec domains')
    .option('--all', 'include archived')
    .action(listHandler);
}

function listHandler(options: { all?: boolean }) {
  const bpDir = findBpDir() ?? join(process.cwd(), 'bp');
  let hasItems = false;

  const changes = listActiveChanges(bpDir);
  if (changes.length > 0) {
    console.log('Active Changes:');
    for (const ch of changes) {
      console.log(`  ${ch}/`);
    }
    hasItems = true;
  }

  const domains = listSpecDomains(bpDir);
  if (domains.length > 0) {
    if (hasItems) console.log('');
    console.log('Spec Domains:');
    for (const d of domains) {
      console.log(`  ${d}/`);
    }
    hasItems = true;
  }

  if (options.all) {
    const archived = listArchivedChanges(bpDir);
    if (archived.length > 0) {
      if (hasItems) console.log('');
      console.log('Archived:');
      for (const a of archived) {
        console.log(`  ${a}/`);
      }
      hasItems = true;
    }
  }

  if (!hasItems) {
    console.log('(empty)');
  }
}
