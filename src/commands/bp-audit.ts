/**
 * bp audit <scope> — human verification of archived changes/phases/milestones.
 * Not in the state machine — standalone entry point.
 */

import { join, basename } from 'node:path';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

export function register(program: any): void {
  const cmd = program
    .command('audit')
    .description('Human verification — audit archived changes, phases, or milestones');

  cmd
    .command('change <name>')
    .description('Audit an archived change')
    .action((name: string) => auditHandler('change', name));

  cmd
    .command('phase <id>')
    .description('Audit all changes in a phase')
    .action((id: string) => auditHandler('phase', id));

  cmd
    .command('milestone <id>')
    .description('Audit all phases in a milestone')
    .action((id: string) => auditHandler('milestone', id));
}

function auditHandler(scope: string, id: string) {
  const cwd = process.cwd();
  const bpDir = join(cwd, 'bp');
  const archiveDir = join(bpDir, 'archive');

  const files = findArchiveEntries(archiveDir, scope, id);

  console.log(JSON.stringify({
    scope,
    id,
    entryCount: files.length,
    entries: files,
    instruction: `Read each entry's change-summary.md and tasks.md. Gather what changed and why. Then create uat.md in the project root.`,
    template: 'Run `bp template uat` for the UAT format. Conduct interactive verification with the user — one test at a time.',
  }));
}

function findArchiveEntries(archiveDir: string, scope: string, id: string): string[] {
  if (!existsSync(archiveDir)) return [];

  if (scope === 'change') {
    // Search archive/changes/ and archive/*/phases/*/ for the change
    const results: string[] = [];
    const walk = (dir: string) => {
      if (!existsSync(dir)) return;
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name.includes(id)) {
            results.push(full);
          }
          walk(full);
        }
      }
    };
    walk(archiveDir);
    return results;
  }

  if (scope === 'phase') {
    // archive/<milestone>/<phase>/
    const results: string[] = [];
    if (!existsSync(archiveDir)) return results;
    for (const ms of readdirSync(archiveDir, { withFileTypes: true })) {
      if (!ms.isDirectory()) continue;
      const phDir = join(archiveDir, ms.name, id);
      if (existsSync(phDir)) {
        for (const ch of readdirSync(phDir, { withFileTypes: true })) {
          if (ch.isDirectory()) results.push(join(phDir, ch.name));
        }
      }
    }
    return results;
  }

  if (scope === 'milestone') {
    // archive/<milestone>/
    const results: string[] = [];
    const msDir = join(archiveDir, id);
    if (!existsSync(msDir)) return results;
    const walk = (dir: string) => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          results.push(full);
          walk(full);
        }
      }
    };
    walk(msDir);
    return results;
  }

  return [];
}
