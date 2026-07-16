/**
 * v2 file-tree - simplified directory operations
 * Two-layer: specs/ (truth) + changes/ (proposed) + changes/archive/ (completed)
 */

import { mkdirSync, existsSync, readdirSync, statSync, rmSync, copyFileSync } from 'node:fs';
import { join } from 'node:path';

/** bp/ directory skeleton subdirectories */
const BP_DIRS = [
  'specs',
  'changes',
  'changes/archive',
  'conventions',
  'schemas',
];

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
  const dir = join(bpDir, 'changes', changeName);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** Get change directory path */
export function changeDir(bpDir: string, changeName: string): string {
  return join(bpDir, 'changes', changeName);
}

/** Archive a change: move to bp/changes/archive/<date>-<name>/ */
export function archiveChangeDir(bpDir: string, changeName: string): string {
  const date = new Date().toISOString().slice(0, 10);
  const sourceDir = join(bpDir, 'changes', changeName);
  const archiveDir = join(bpDir, 'changes', 'archive', `${date}-${changeName}`);

  if (existsSync(sourceDir)) {
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
