/**
 * bp - shared utility functions for command modules.
 */

import { join, dirname } from 'node:path';
import { validateContextJsonlFile } from '../core/artifact-validator.js';
import { listActiveChanges } from '../core/file-tree.js';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

interface GeneratedFile {
  path: string;
  content: string;
}

/** Default bp/ directory (based on cwd). */
export function findBlueprintDir(): string {
  return join(process.cwd(), 'bp');
}

/** Find bp/ directory by walking up from cwd (searches for config.yaml or project.yml) */
export function findBpDir(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, 'bp');
    if (existsSync(join(candidate, 'config.yaml')) || existsSync(join(candidate, 'project.yml'))) {
      return candidate;
    }
    const parent = dir.split('/').slice(0, -1).join('/');
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Write generated files to disk, creating directories as needed. */
export function writeGeneratedFiles(files: GeneratedFile[]): void {
  for (const file of files) {
    const dir = dirname(file.path);
    if (dir) mkdirSync(dir, { recursive: true });
    writeFileSync(file.path, file.content, 'utf-8');
  }
}

/** Resolve change name: use provided name or auto-detect from active changes. */
export function resolveChangeName(bpDir: string, name?: string): string | null {
  if (name) return name;
  const active = listActiveChanges(bpDir);
  if (active.length === 0) {
    console.error('No active changes found.');
    return null;
  }
  if (active.length === 1) return active[0];
  console.log('Multiple active changes:');
  for (const c of active) {
    console.log(`  - ${c}`);
  }
  console.log('\nSpecify a change name.');
  return null;
}

/** Gate: exit non-zero if context.jsonl is invalid for the requested phase. */
export function gateContextJsonl(
  bpDir: string,
  changeName: string,
  phase: 'plan' | 'apply' | 'review' | 'archive',
): boolean {
  const contextPath = join(bpDir, 'changes', changeName, 'context.jsonl');
  if (!existsSync(contextPath)) return true;
  const result = validateContextJsonlFile(contextPath, bpDir, phase);
  if (result.valid) return true;
  for (const err of result.errors) {
    console.error(`${contextPath}:${err.line}: [${err.code}] ${err.message}`);
  }
  return false;
}
