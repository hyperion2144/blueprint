/**
 * codebase-map — generates a structural map of the codebase.
 *
 * v2.1 rewrite:
 * - No git dependency (uses file fingerprint: path+size SHA-256)
 * - @babel/parser for TS/JS AST parsing (exports + imports + responsibility)
 * - Regex fallback for other languages
 * - depends_on extracted from import paths
 * - Three-layer output (L0 overview / L1 module list / L2 detail on demand)
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, extname } from 'node:path';
import type { LanguageParser, ModuleSummary, CodebaseMap } from './parsers/parser-base.js';
import { collectSourceFiles, computeFingerprint, loadGitignore } from './parsers/parser-base.js';
import { tsParser } from './parsers/ts-parser.js';

/** Fallback regex parser for unsupported languages */
const regexParser: LanguageParser = {
  language: 'regex',
  extensions: ['.py', '.go', '.rs', '.java', '.rb', '.php', '.c', '.cpp', '.h', '.cs'],
  parseFile(content: string, _filePath: string) {
    // Python: def/class at column 0; Go: func/type; Rust: pub fn/struct; Java: public class
    const exports = (content.match(/(?:^|\n)\s*(?:pub\s+)?(?:func|def|class|object|fn|struct|enum|trait|impl)\s+(\w+)/g) || [])
      .map(m => { const mm = m.match(/(\w+)\s*$/); return mm ? mm[1] : ''; })
      .filter(Boolean);
    const imports = (content.match(/(?:^|\n)\s*(?:import|from|use)\s+['"]?([^\s'"();]+)/g) || [])
      .map(m => { const mm = m.match(/\s+([^\s'"();]+)$/); return mm ? mm[1] : ''; })
      .filter(Boolean);
    const firstLine = content.split('\n')[0] || '';
    const responsibility = (firstLine.startsWith('#') || firstLine.startsWith('//') || firstLine.startsWith('//'))
      ? firstLine.replace(/^[#/]+\s*/, '').trim() : '';
    return { exports, imports, responsibility };
  },
};

function getParserForFile(filePath: string): LanguageParser {
  if (tsParser.extensions.includes(extname(filePath))) return tsParser;
  return regexParser;
}

/** All supported source file extensions — no stack-based restriction */
const ALL_SOURCE_EXTENSIONS = [
  ...tsParser.extensions,
  '.py', '.go', '.rs', '.java', '.rb', '.php', '.c', '.cpp', '.h', '.cs',
  '.swift', '.kt', '.scala', '.lua', '.r', '.dart',
];

/** Map a relative import path to a module name for depends_on */
function mapImportToModule(importPath: string, currentModule: string, allModules: Set<string>): string | null {
  if (!importPath.startsWith('.')) return null; // package import — no internal dependency

  // Resolve relative path against current module directory
  const modDir = currentModule.includes('/') ? currentModule.split('/').slice(0, -1).join('/') : '';
  const parts = modDir ? modDir.split('/') : [];
  const relParts = importPath.replace(/\.(ts|tsx|js|jsx|mjs|cjs)$/, '').replace(/\/index$/, '').split('/');

  for (const p of relParts) {
    if (p === '.') continue;
    if (p === '..') { parts.pop(); continue; }
    parts.push(p);
  }

  const resolved = parts.join('/');

  // Match against known modules
  for (const mod of allModules) {
    if (mod === resolved) return mod;
    // Handle src/core/config vs core/config
    if (mod.replace(/^src\//, '') === resolved.replace(/^src\//, '')) return mod;
  }

  return resolved || null;
}

function inferResponsibility(name: string, exports: string[]): string {
  const baseName = name.split('/').pop() || name;
  if (exports.length === 0) return `${baseName} (no public exports)`;
  return `${baseName} (${exports.length} exports: ${exports.slice(0, 3).join(', ')}${exports.length > 3 ? '...' : ''})`;
}

function detectEntry(rootDir: string): string {
  // Read from package.json if present — no hardcoded path guessing
  if (existsSync(join(rootDir, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
      if (pkg.bin) {
        if (typeof pkg.bin === 'string') return pkg.bin;
        const first = Object.values(pkg.bin)[0];
        if (first) return first as string;
      }
      if (pkg.main) return pkg.main;
      if (pkg.module) return pkg.module;
    } catch {}
  }
  return 'unknown';
}

export function generateCodebaseMap(rootDir: string): CodebaseMap {
  const ig = loadGitignore(rootDir);

  // Scan entire project root — no directory or stack restriction.
  // .gitignore + hardcoded skips (.git, node_modules, dist, bin) handle exclusions.
  const sourceFiles: string[] = [];
  collectSourceFiles(rootDir, ALL_SOURCE_EXTENSIONS, '', sourceFiles, ig);

  const fingerprint = computeFingerprint(rootDir, sourceFiles.map(f => join(rootDir, f)));

  // Group files by module (directory path under src/)
  const moduleMap = new Map<string, { files: string[]; exports: string[]; imports: string[]; responsibility: string }>();

  for (const file of sourceFiles) {
    const fullPath = join(rootDir, file);
    if (!existsSync(fullPath)) continue;
    const content = readFileSync(fullPath, 'utf-8');

    // Module = parent directory path (e.g., src/core/continue → src/core/continue)
    const parts = file.split('/');
    const moduleName = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';

    if (!moduleMap.has(moduleName)) {
      moduleMap.set(moduleName, { files: [], exports: [], imports: [], responsibility: '' });
    }
    const mod = moduleMap.get(moduleName)!;
    mod.files.push(file);

    const parser = getParserForFile(file);
    const result = parser.parseFile(content, file);
    mod.exports.push(...result.exports);
    mod.imports.push(...result.imports);
    if (!mod.responsibility && result.responsibility) mod.responsibility = result.responsibility;
  }

  const allModuleNames = new Set(moduleMap.keys());

  const modules: ModuleSummary[] = [];
  for (const [name, data] of moduleMap) {
    const depends_on = new Set<string>();
    for (const imp of data.imports) {
      const dep = mapImportToModule(imp, name, allModuleNames);
      if (dep && dep !== name) depends_on.add(dep);
    }

    modules.push({
      name,
      responsibility: data.responsibility || inferResponsibility(name, [...new Set(data.exports)]),
      public_api: [...new Set(data.exports)],
      depends_on: [...depends_on].sort(),
      file_count: data.files.length,
    });
  }

  return {
    fingerprint,
    stack: '',
    entry: detectEntry(rootDir),
    generated_at: new Date().toISOString(),
    modules: modules.sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export function writeCodebaseMap(bpDir: string, map: CodebaseMap): void {
  const jsonPath = join(bpDir, '.codebase-map.json');
  const mdPath = join(bpDir, '.codebase-map.md');
  writeFileSync(jsonPath, JSON.stringify(map, null, 2), 'utf-8');
  writeFileSync(mdPath, renderMapMarkdown(map), 'utf-8');
}

/** Render three-layer markdown: L0 overview / L1 module list / L2 detail */
function renderMapMarkdown(map: CodebaseMap): string {
  // L0: Project overview
  const lines: string[] = [
    '# Codebase Map',
    '',
    `**Fingerprint**: \`${map.fingerprint}\`  **Stack**: ${map.stack}  **Entry**: ${map.entry}`,
    `**Generated**: ${map.generated_at}  **Modules**: ${map.modules.length}`,
    '',
    '## L0: Project Overview',
    '',
    `This is a **${map.stack}** project with ${map.modules.length} module(s).`,
    `Entry point: \`${map.entry}\`.`,
    '',
    '## L1: Module List',
    '',
  ];

  // L1: Module summaries
  for (const mod of map.modules) {
    lines.push(`### ${mod.name}`);
    lines.push(`- **Responsibility**: ${mod.responsibility}`);
    lines.push(`- **Files**: ${mod.file_count}`);
    if (mod.public_api.length > 0) {
      lines.push(`- **Public API**: ${mod.public_api.join(', ')}`);
    }
    if (mod.depends_on.length > 0) {
      lines.push(`- **Depends on**: ${mod.depends_on.join(', ')}`);
    }
    lines.push('');
  }

  // L2: Interface detail (full export list per module)
  lines.push('## L2: Interface Detail');
  lines.push('');
  for (const mod of map.modules) {
    if (mod.public_api.length === 0) continue;
    lines.push(`### ${mod.name}`);
    for (const api of mod.public_api) {
      lines.push(`- \`${api}\``);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/** Check if map is stale by comparing fingerprints (no git needed) */
export function isMapStale(bpDir: string, rootDir: string): boolean {
  const mapPath = join(bpDir, '.codebase-map.json');
  if (!existsSync(mapPath)) return true;
  try {
    const map = JSON.parse(readFileSync(mapPath, 'utf-8')) as CodebaseMap;
    const ig = loadGitignore(rootDir);
    const sourceFiles: string[] = [];
    collectSourceFiles(rootDir, ALL_SOURCE_EXTENSIONS, '', sourceFiles, ig);
    const currentFingerprint = computeFingerprint(rootDir, sourceFiles.map(f => join(rootDir, f)));
    return map.fingerprint !== currentFingerprint;
  } catch {
    return true;
  }
}

// ── Query API (v2.1: agent queries on-demand instead of reading whole JSON) ──

/** Load map from .codebase-map.json */
export function loadMap(bpDir: string): CodebaseMap | null {
  const mapPath = join(bpDir, '.codebase-map.json');
  if (!existsSync(mapPath)) return null;
  try { return JSON.parse(readFileSync(mapPath, 'utf-8')) as CodebaseMap; }
  catch { return null; }
}

/** Find module by name (fuzzy: 'core/config' matches 'src/core/config') */
function findModule(map: CodebaseMap, name: string): ModuleSummary | undefined {
  let mod = map.modules.find(m => m.name === name);
  if (mod) return mod;
  mod = map.modules.find(m => m.name.endsWith('/' + name) || m.name.includes(name));
  return mod;
}

/** L0: list all modules with one-line responsibility */
export function queryList(map: CodebaseMap): string {
  const lines: string[] = [`Modules (${map.modules.length}):`];
  for (const mod of map.modules) {
    lines.push(`  ${mod.name} — ${mod.responsibility} (${mod.public_api.length} exports, ${mod.depends_on.length} deps)`);
  }
  return lines.join('\n');
}

/** L1: full module info */
export function queryModule(map: CodebaseMap, name: string): string {
  const mod = findModule(map, name);
  if (!mod) return `Module "${name}" not found. Run 'bp map list' for available modules.`;
  const lines: string[] = [
    `Module: ${mod.name}`,
    `Responsibility: ${mod.responsibility}`,
    `Files: ${mod.file_count}`,
    `Public API (${mod.public_api.length}): ${mod.public_api.join(', ')}`,
  ];
  if (mod.depends_on.length > 0) {
    lines.push(`Depends on (${mod.depends_on.length}): ${mod.depends_on.join(', ')}`);
  }
  return lines.join('\n');
}

/** Recursive dependency chain */
export function queryDeps(map: CodebaseMap, name: string): string {
  const mod = findModule(map, name);
  if (!mod) return `Module "${name}" not found.`;
  const visited = new Set<string>();
  const queue = [mod.name];
  const chain: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (visited.has(current)) continue;
    visited.add(current);
    const currentMod = findModule(map, current);
    if (!currentMod) continue;
    for (const dep of currentMod.depends_on) {
      if (!visited.has(dep)) { chain.push(`${current} → ${dep}`); queue.push(dep); }
    }
  }
  if (chain.length === 0) return `${mod.name} has no dependencies.`;
  return `Dependency chain for ${mod.name}:\n  ${chain.join('\n  ')}`;
}

/** Reverse dependency: who depends on this module (impact radius) */
export function queryImpact(map: CodebaseMap, name: string): string {
  const mod = findModule(map, name);
  if (!mod) return `Module "${name}" not found.`;
  const dependents = new Set<string>();
  const queue = [mod.name];
  while (queue.length > 0) {
    const target = queue.shift()!;
    for (const m of map.modules) {
      if (m.depends_on.some(d => d === target || d.endsWith('/' + target)) && !dependents.has(m.name)) {
        dependents.add(m.name);
        queue.push(m.name);
      }
    }
  }
  if (dependents.size === 0) return `No modules depend on ${mod.name}.`;
  return `Impact radius for ${mod.name} (${dependents.size} module(s) depend on it):\n  ${[...dependents].sort().join('\n  ')}`;
}

/** Search modules/exports by keyword */
export function querySearch(map: CodebaseMap, keyword: string): string {
  const lower = keyword.toLowerCase();
  const modMatches = map.modules.filter(m => m.name.toLowerCase().includes(lower) || m.responsibility.toLowerCase().includes(lower));
  const exportMatches = map.modules.flatMap(m => m.public_api.filter(a => a.toLowerCase().includes(lower)).map(a => `${m.name}: ${a}`));
  const lines: string[] = [];
  if (modMatches.length > 0) { lines.push(`Modules matching "${keyword}":`); for (const m of modMatches) lines.push(`  ${m.name} — ${m.responsibility}`); }
  if (exportMatches.length > 0) { lines.push(`Exports matching "${keyword}":`); for (const e of exportMatches) lines.push(`  ${e}`); }
  if (lines.length === 0) return `No matches for "${keyword}".`;
  return lines.join('\n');
}
