/**
 * specwf list — 列出 milestones/phases/changes
 */

import { join } from 'node:path';
import { listMilestones, listPhases, listChanges, listAdhocChanges, listArchived } from '../core/file-tree.js';

export function register(program: any): void {
  program
    .command('list')
    .description('列出 milestones/phases/changes')
    .option('--all', '包含归档')
    .action(listHandler);
}

function listHandler(options: { all?: boolean }) {
  const specwfDir = join(process.cwd(), 'specwf');
  let hasItems = false;

  const milestones = listMilestones(specwfDir);
  if (milestones.length > 0) {
    console.log('Milestones:');
    for (const ms of milestones) {
      console.log(`  ${ms}/`);
      const phases = listPhases(specwfDir, ms);
      for (const ph of phases) {
        console.log(`    ${ph}/`);
        const changes = listChanges(specwfDir, ms, ph);
        for (const ch of changes) {
          console.log(`      ${ch}/`);
        }
      }
    }
    hasItems = true;
  }

  const adhoc = listAdhocChanges(specwfDir);
  if (adhoc.length > 0) {
    if (hasItems) console.log('');
    console.log('临时 Changes:');
    for (const ch of adhoc) {
      console.log(`  ${ch}/`);
    }
    hasItems = true;
  }

  if (options.all) {
    const archived = listArchived(specwfDir);
    if (archived.length > 0) {
      if (hasItems) console.log('');
      console.log('归档:');
      for (const a of archived) {
        console.log(`  ${a}/`);
      }
      hasItems = true;
    }
  }

  if (!hasItems) {
    console.log('(无条目)');
  }
}
