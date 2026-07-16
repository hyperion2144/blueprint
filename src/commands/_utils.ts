/**
 * bp - shared utility functions for command modules.
 */

import { join, dirname } from 'node:path';
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
