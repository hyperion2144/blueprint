/**
 * bp — shared utility functions for command modules.
 */

import { join } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

interface GeneratedFile {
  path: string;
  content: string;
}

/** Default bp/ directory (based on cwd). All commands should use this function. */
export function findBlueprintDir(): string {
  return join(process.cwd(), 'bp');
}

/** Write generated files to disk, creating directories as needed. */
export function writeGeneratedFiles(files: GeneratedFile[]): void {
  for (const file of files) {
    const dir = dirname(file.path);
    if (dir) mkdirSync(dir, { recursive: true });
    writeFileSync(file.path, file.content, 'utf-8');
  }
}
