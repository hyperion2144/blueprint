/**
 * bp list — 列出 milestones/phases/changes
 */

import { join } from 'node:path';
import { listMilestones, listPhases, listChanges, listAdhocChanges, listArchived } from '../core/file-tree.js';

export function register(program: any): void {
  program
    .command('list')
    .description('List milestones/phases/changes')
    .option('--all', 'include archived')
    .action(listHandler);
}

function listHandler(options: { all?: boolean }) {
  const bpDir = join(process.cwd(), 'bp');
  let hasItems = false;

  const milestones = listMilestones(bpDir);
  if (milestones.length > 0) {
    console.log('Milestones:');
    for (const ms of milestones) {
      console.log(`  ${ms}/`);
      const phases = listPhases(bpDir, ms);
      for (const ph of phases) {
        console.log(`    ${ph}/`);
        const changes = listChanges(bpDir, ms, ph);
        for (const ch of changes) {
          console.log(`      ${ch}/`);
        }
      }
    }
    hasItems = true;
  }

  const adhoc = listAdhocChanges(bpDir);
  if (adhoc.length > 0) {
    if (hasItems) console.log('');
    console.log('Adhoc Changes:');
    for (const ch of adhoc) {
      console.log(`  ${ch}/`);
    }
    hasItems = true;
  }

  if (options.all) {
    const archived = listArchived(bpDir);
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
