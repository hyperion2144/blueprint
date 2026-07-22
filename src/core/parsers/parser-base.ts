/**
 * parser-base — common interfaces and utilities for codebase map generation.
 * No git dependency — uses file fingerprint (path+size SHA-256).
 * Respects .gitignore via the 'ignore' package.
 */

import { createHash } from 'node:crypto';
import { statSync, readdirSync, existsSync, readFileSync } from 'node:fs';
import { join, extname } from 'node:path';
import ignore, { type Ignore } from 'ignore';

export interface ModuleSummary {
  name: string;
  responsibility: string;
  public_api: string[];
  depends_on: string[];
  file_count: number;
}

export interface CodebaseMap {
  /** File fingerprint (path+size SHA-256) — replaces git_hash */
  fingerprint: string;
  stack: string;
  entry: string;
  generated_at: string;
  modules: ModuleSummary[];
}

export interface LanguageParser {
  language: string;
  extensions: string[];
  parseFile(content: string, filePath: string): { exports: string[]; imports: string[]; responsibility: string };
}

/** Collect all source files matching extensions, excluding node_modules/.git/dist/bin and .gitignore matches */
export function collectSourceFiles(dir: string, extensions: string[], prefix = '', files: string[] = [], ig?: Ignore): string[] {
  if (!existsSync(dir)) return files;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist' || entry.name === 'bin') continue;
    const fullPath = join(dir, entry.name);
    const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (ig && ig.ignores(relPath)) continue;
    if (entry.isDirectory()) {
      collectSourceFiles(fullPath, extensions, relPath, files, ig);
    } else if (extensions.includes(extname(entry.name))) {
      files.push(relPath);
    }
  }
  return files;
}

/** Compute fingerprint from file paths + sizes (no git needed) */
export function computeFingerprint(rootDir: string, sourceFiles: string[]): string {
  const entries = sourceFiles
    .sort()
    .map(f => {
      try { return `${f}:${statSync(join(rootDir, f)).size}`; }
      catch { return `${f}:0`; }
    })
    .join('\n');
  return createHash('sha256').update(entries).digest('hex').slice(0, 16);
}

/** Load .gitignore and return an Ignore instance */
export function loadGitignore(rootDir: string): Ignore {
  const ig = ignore();
  const gitignorePath = join(rootDir, '.gitignore');
  if (existsSync(gitignorePath)) {
    ig.add(readFileSync(gitignorePath, 'utf-8'));
  }
  return ig;
}

/** Detect project stack from config files */
export function detectStack(rootDir: string): string {
  if (existsSync(join(rootDir, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps['vue']) return 'vue';
      if (deps['svelte']) return 'svelte';
      if (deps['react']) return 'react';
    } catch { /* invalid package.json */ }
    return 'node';
  }
  if (existsSync(join(rootDir, 'go.mod'))) return 'go';
  if (existsSync(join(rootDir, 'Cargo.toml'))) return 'rust';
  if (existsSync(join(rootDir, 'pom.xml')) || existsSync(join(rootDir, 'build.gradle'))) return 'java';
  if (existsSync(join(rootDir, 'requirements.txt')) || existsSync(join(rootDir, 'pyproject.toml'))) return 'python';
  return 'unknown';
}
