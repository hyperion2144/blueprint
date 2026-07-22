import { Command } from 'commander';
import { findBpDir } from './_utils.js';
import { generateCodebaseMap, writeCodebaseMap, isMapStale, loadMap, queryList, queryModule, queryFiles, queryFile, querySymbol, queryDeps, queryImpact, querySearch } from '../core/codebase-map.js';
import { join } from 'node:path';

export function register(program: Command): void {
  const map = program.command('map').description('Manage and query codebase map');

  map
    .command('refresh')
    .description('Regenerate codebase map (module structure, public API, dependencies)')
    .option('--check', 'Only check if map is stale, do not regenerate')
    .action(refreshHandler);

  map
    .command('list')
    .description('List all modules with one-line responsibility (L0 overview)')
    .action(listHandler);

  map
    .command('module <name>')
    .description('Show full info for a specific module (L1 detail: exports, deps, responsibility)')
    .action(moduleHandler);

  map
    .command('deps <module>')
    .description('Show recursive dependency chain for a module')
    .action(depsHandler);

  map
    .command('impact <module>')
    .description('Show impact radius: which modules depend on this one (for change impact analysis)')
    .action(impactHandler);

  map
    .command('files <module>')
    .description('List files in a module with export/import counts')
    .action(filesHandler);

  map
    .command('file <path>')
    .description('Show full info for a specific file (exports, imports, module)')
    .action(fileHandler);

  map
    .command('symbol <name>')
    .description('Find which file defines a function/class/symbol')
    .action(symbolHandler);

  map
    .command('search <keyword>')
    .description('Search modules and exports by keyword')
    .action(searchHandler);
}

function getMap(bpDir: string) {
  const map = loadMap(bpDir);
  if (!map) {
    console.error('Codebase map not found. Run "bp map refresh" first.');
    process.exit(1);
  }
  return map;
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

function listHandler(): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  console.log(queryList(getMap(bpDir)));
}

function moduleHandler(name: string): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  console.log(queryModule(getMap(bpDir), name));
}

function depsHandler(module: string): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  console.log(queryDeps(getMap(bpDir), module));
}

function impactHandler(module: string): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  console.log(queryImpact(getMap(bpDir), module));
}

function filesHandler(module: string): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  console.log(queryFiles(getMap(bpDir), module));
}

function fileHandler(filePath: string): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  console.log(queryFile(getMap(bpDir), filePath));
}

function symbolHandler(name: string): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  console.log(querySymbol(getMap(bpDir), name));
}

function searchHandler(keyword: string): void {
  const bpDir = findBpDir();
  if (!bpDir) { console.error('Not in a blueprint project.'); process.exit(1); }
  console.log(querySearch(getMap(bpDir), keyword));
}
