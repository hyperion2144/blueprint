import { Command } from 'commander';
import { findBpDir } from './_utils.js';
import { generateCodebaseMap, writeCodebaseMap, isMapStale } from '../core/codebase-map.js';
import { join } from 'node:path';

export function register(program: Command): void {
  const map = program.command('map').description('Manage codebase map');
  map
    .command('refresh')
    .description('Regenerate codebase map (module structure, public API, dependencies)')
    .option('--check', 'Only check if map is stale, do not regenerate')
    .action(refreshHandler);
}

function refreshHandler(options: { check?: boolean }): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  const rootDir = join(bpDir, '..');
  if (options.check) {
    const stale = isMapStale(bpDir, rootDir);
    console.log(stale ? 'STALE: codebase map is outdated. Run bp map refresh.' : 'OK: codebase map is current.');
    return;
  }
  const map = generateCodebaseMap(rootDir);
  writeCodebaseMap(bpDir, map);
  console.log(`Codebase map generated: ${map.modules.length} modules, fingerprint ${map.fingerprint}`);
  console.log(`Written to bp/.codebase-map.json + bp/.codebase-map.md`);
}
