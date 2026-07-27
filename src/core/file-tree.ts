/**
 * v2 file-tree - simplified directory operations
 * Two-layer: specs/ (truth) + changes/ (proposed) + changes/archive/ (completed)
 */

import { mkdirSync, existsSync, readdirSync, statSync, rmSync, copyFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

/** bp/ directory skeleton subdirectories */
const BP_DIRS = [
  'specs',
  'changes',
  'changes/archive',
  'conventions',
  'schemas',
];

/**
 * Validate a change name. Rejects path separators, `..` segments, and any
 * character outside the safe set. Prevents path traversal via CLI args such
 * as `bp propose ../../etc/pwned`.
 */
export function validateChangeName(changeName: string): void {
  if (typeof changeName !== 'string' || changeName.length === 0) {
    throw new Error(`Invalid change name: empty`);
  }
  if (changeName.length > 64) {
    throw new Error(`Invalid change name: too long (max 64 chars): ${changeName}`);
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(changeName)) {
    throw new Error(
      `Invalid change name: ${JSON.stringify(changeName)}. ` +
      `Allowed: alphanumeric, '.', '_', '-'; must start with alphanumeric.`,
    );
  }
  if (changeName.includes('..')) {
    throw new Error(`Invalid change name: '..' segments are not allowed: ${changeName}`);
  }
}

/**
 * Defense-in-depth: assert a resolved path stays under the expected parent
 * directory. Guards against any traversal the regex above might miss.
 */
function assertWithin(parent: string, child: string): void {
  const parentResolved = resolve(parent) + sep;
  const childResolved = resolve(child);
  if (childResolved !== resolve(parent) && !childResolved.startsWith(parentResolved)) {
    throw new Error(
      `Path traversal blocked: ${child} escapes ${parent}`,
    );
  }
}

/** Create bp/ directory skeleton */
export function createBlueprintStructure(bpDir: string): void {
  mkdirSync(bpDir, { recursive: true });
  for (const dir of BP_DIRS) {
    mkdirSync(join(bpDir, dir), { recursive: true });
  }
}

/** Check if bp/ is initialized (config.yaml exists) */
export function isInitialized(bpDir: string): boolean {
  return existsSync(join(bpDir, 'config.yaml'));
}

/** Create a change directory: bp/changes/<name>/ */
export function createChangeDir(bpDir: string, changeName: string): string {
  validateChangeName(changeName);
  const dir = join(bpDir, 'changes', changeName);
  assertWithin(join(bpDir, 'changes'), dir);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Get change directory path */
export function changeDir(bpDir: string, changeName: string): string {
  validateChangeName(changeName);
  const dir = join(bpDir, 'changes', changeName);
  assertWithin(join(bpDir, 'changes'), dir);
  return dir;
}

/** Archive a change: move to bp/changes/archive/<date>-<name>/ */
export function archiveChangeDir(bpDir: string, changeName: string): string {
  validateChangeName(changeName);
  const date = new Date().toISOString().slice(0, 10);
  const sourceDir = join(bpDir, 'changes', changeName);
  const archiveDir = join(bpDir, 'changes', 'archive', `${date}-${changeName}`);
  assertWithin(join(bpDir, 'changes'), sourceDir);
  assertWithin(join(bpDir, 'changes', 'archive'), archiveDir);

  if (existsSync(sourceDir)) {
    // Copy to archive then remove source. Use copy+rm rather than rename
    // because source and archive may be on different filesystems.
    mkdirSync(archiveDir, { recursive: true });
    copyDirRecursive(sourceDir, archiveDir);
    rmSync(sourceDir, { recursive: true, force: true });
  }
  return archiveDir;
}

function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src, { withFileTypes: true })) {
    const srcPath = join(src, entry.name);
    const destPath = join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

/** List active changes (directories in bp/changes/, excluding archive/) */
export function listActiveChanges(bpDir: string): string[] {
  const dir = join(bpDir, 'changes');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    if (e === 'archive') return false;
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** List archived changes (directories in bp/changes/archive/) */
export function listArchivedChanges(bpDir: string): string[] {
  const dir = join(bpDir, 'changes', 'archive');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** List spec domains (directories in bp/specs/) */
export function listSpecDomains(bpDir: string): string[] {
  const dir = join(bpDir, 'specs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}
