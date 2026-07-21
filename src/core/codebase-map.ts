import { existsSync, readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, extname, basename, relative } from 'node:path';
import { execSync } from 'node:child_process';

export interface ModuleSummary {
  name: string;           // 模块路径（如 core/continue）
  responsibility: string; // 一句话职责
  public_api: string[];   // 导出的函数/类名
  depends_on: string[];    // 依赖的其他模块
}

export interface CodebaseMap {
  git_hash: string;       // 版本标记
  stack: string;           // 技术栈
  entry: string;           // 入口文件
  modules: ModuleSummary[];
}

/** Generate L0+L1 codebase map */
export function generateCodebaseMap(rootDir: string): CodebaseMap {
  const gitHash = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf-8' }).trim();
  // Scan src/ for modules
  const srcDir = join(rootDir, 'src');
  const modules: ModuleSummary[] = [];
  if (existsSync(srcDir)) {
    scanModules(srcDir, 'src', modules);
  }
  return { git_hash: gitHash, stack: detectStack(rootDir), entry: 'src/cli.ts', modules };
}

function scanModules(dir: string, prefix: string, modules: ModuleSummary[]): void {
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      const subDir = join(dir, entry.name);
      const modName = `${prefix}/${entry.name}`;
      // Check if dir has .ts files → it's a module
      const hasTs = readdirSync(subDir).some((f) => f.endsWith('.ts'));
      if (hasTs) {
        modules.push({ name: modName, responsibility: '', public_api: extractExports(subDir), depends_on: [] });
      }
      scanModules(subDir, modName, modules);
    }
  }
}

function extractExports(dir: string): string[] {
  const exports: string[] = [];
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
    const content = readFileSync(join(dir, file), 'utf-8');
    const matches = content.matchAll(/export\s+(?:function|class|const|interface|type)\s+(\w+)/g);
    for (const m of matches) exports.push(m[1]);
  }
  return exports;
}

function detectStack(rootDir: string): string {
  if (existsSync(join(rootDir, 'package.json'))) return 'node';
  if (existsSync(join(rootDir, 'go.mod'))) return 'go';
  if (existsSync(join(rootDir, 'Cargo.toml'))) return 'rust';
  if (existsSync(join(rootDir, 'pom.xml')) || existsSync(join(rootDir, 'build.gradle'))) return 'java';
  return 'unknown';
}

/** Write codebase map to bp/.codebase-map.json + .md */
export function writeCodebaseMap(bpDir: string, map: CodebaseMap): void {
  const jsonPath = join(bpDir, '.codebase-map.json');
  writeFileSync(jsonPath, JSON.stringify(map, null, 2), 'utf-8');
  // Also write human-readable .md for sub-agent consumption
  const mdPath = join(bpDir, '.codebase-map.md');
  const md = renderMapMarkdown(map);
  writeFileSync(mdPath, md, 'utf-8');
}

function renderMapMarkdown(map: CodebaseMap): string {
  const lines: string[] = ['# Codebase Map', '', `**Git**: ${map.git_hash}  **Stack**: ${map.stack}  **Entry**: ${map.entry}`, '', '## Modules', ''];
  for (const mod of map.modules) {
    lines.push(`### ${mod.name}`);
    if (mod.responsibility) lines.push(`- Responsibility: ${mod.responsibility}`);
    if (mod.public_api.length) lines.push(`- Public API: ${mod.public_api.join(', ')}`);
    if (mod.depends_on.length) lines.push(`- Depends on: ${mod.depends_on.join(', ')}`);
    lines.push('');
  }
  return lines.join('\n');
}

/** Check if map is stale (git_hash mismatch) */
export function isMapStale(bpDir: string, rootDir: string): boolean {
  const mapPath = join(bpDir, '.codebase-map.json');
  if (!existsSync(mapPath)) return true;
  try {
    const map = JSON.parse(readFileSync(mapPath, 'utf-8')) as CodebaseMap;
    const currentHash = execSync('git rev-parse --short HEAD', { cwd: rootDir, encoding: 'utf-8' }).trim();
    return map.git_hash !== currentHash;
  } catch { return true; }
}
