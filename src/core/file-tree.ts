/**
 * file-tree — 产物目录树操作
 * 创建 bp/ 骨架、遍历目录、查找 change
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync, renameSync, copyFileSync } from 'node:fs';
import { join, basename } from 'node:path';

/** bp/ 目录骨架的子目录 */
const BP_DIRS = [
  'specs',
  'conventions',
  'research',
  'milestones',
  'changes',
  'archive',
  'workspace',
];

/** 创建 bp/ 目录骨架 */
export function createBlueprintStructure(bpDir: string): void {
  mkdirSync(bpDir, { recursive: true });
  for (const dir of BP_DIRS) {
    mkdirSync(join(bpDir, dir), { recursive: true });
  }
}

/** 检查 bp/ 是否已初始化 */
export function isInitialized(bpDir: string): boolean {
  return existsSync(join(bpDir, 'project.yml')) &&
         existsSync(join(bpDir, 'state.md'));
}

/** 创建 milestone 目录 */
export function createMilestoneDir(bpDir: string, milestoneId: string): string {
  const dir = join(bpDir, 'milestones', milestoneId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 创建 phase 目录 */
export function createPhaseDir(
  bpDir: string,
  milestoneId: string,
  phaseId: string,
): string {
  const dir = join(bpDir, 'milestones', milestoneId, 'phases', phaseId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 创建 change 目录 */
export function createChangeDir(
  bpDir: string,
  milestoneId: string,
  phaseId: string,
  changeName: string,
): string {
  const dir = join(
    bpDir,
    'milestones',
    milestoneId,
    'phases',
    phaseId,
    'changes',
    changeName,
  );
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, 'specs'), { recursive: true });
  return dir;
}

/** 创建临时 change 目录 */
export function createAdhocChangeDir(bpDir: string, changeName: string): string {
  const dir = join(bpDir, 'changes', changeName);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, 'specs'), { recursive: true });
  return dir;
}

/** 归档 change — organized by milestone/phase/change */
export function archiveChangeDir(
  bpDir: string,
  changeDir: string,
): string {
  const changeName = basename(changeDir);
  const date = new Date().toISOString().slice(0, 10);

  // Extract milestone/phase from path: .../milestones/<mid>/phases/<pid>/changes/<name>
  const parts = changeDir.split(/[/\\]/);
  const msIdx = parts.indexOf('milestones');
  const chIdx = parts.indexOf('changes');
  if (msIdx >= 0 && chIdx > msIdx) {
    // Phase-scoped change: archive/<milestone>/<phase>/<change>/
    const ms = parts[msIdx + 1];
    const ph = parts[chIdx - 1]; // phase ID is before 'changes'
    const archiveRoot = join(bpDir, 'archive', ms, ph);
    mkdirSync(archiveRoot, { recursive: true });
    const archiveDir = join(archiveRoot, `${date}-${changeName}`);
    if (existsSync(changeDir)) {
      copyDirRecursive(changeDir, archiveDir);
      rmSync(changeDir, { recursive: true, force: true });
    }
    return archiveDir;
  }

  // Adhoc change: archive/changes/<date>-<name>/
  const archiveRoot = join(bpDir, 'archive', 'changes');
  mkdirSync(archiveRoot, { recursive: true });
  const archiveDir = join(archiveRoot, `${date}-${changeName}`);
  if (existsSync(changeDir)) {
    copyDirRecursive(changeDir, archiveDir);
    rmSync(changeDir, { recursive: true, force: true });
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

/** 归档 milestone 到 archive/milestones/ */
export function archiveMilestoneDir(
  bpDir: string,
  milestoneId: string,
): string {
  const sourceDir = join(bpDir, 'milestones', milestoneId);
  const archiveDir = join(bpDir, 'archive', 'milestones', milestoneId);
  
  if (!existsSync(sourceDir)) {
    return archiveDir;
  }
  
  mkdirSync(join(bpDir, 'archive', 'milestones'), { recursive: true });
  
  // 移动整个 milestone 目录
  renameSync(sourceDir, archiveDir);
  
  return archiveDir;
}



/** 列出所有 milestones */
export function listMilestones(bpDir: string): string[] {
  const dir = join(bpDir, 'milestones');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** 列出 milestone 下的 phases */
export function listPhases(bpDir: string, milestoneId: string): string[] {
  const dir = join(bpDir, 'milestones', milestoneId, 'phases');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** 列出 phase 下的 changes */
export function listChanges(
  bpDir: string,
  milestoneId: string,
  phaseId: string,
): string[] {
  const dir = join(bpDir, 'milestones', milestoneId, 'phases', phaseId, 'changes');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** 列出临时 changes */
export function listAdhocChanges(bpDir: string): string[] {
  const dir = join(bpDir, 'changes');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** 列出归档的 changes（在 archive/changes/ 下） */
export function listArchived(bpDir: string): string[] {
  const dir = join(bpDir, 'archive', 'changes');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}
