/**
 * file-tree — 产物目录树操作
 * 创建 specwf/ 骨架、遍历目录、查找 change
 */

import { mkdirSync, existsSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { join } from 'node:path';

/** specwf/ 目录骨架的子目录 */
const SPECWF_DIRS = [
  'specs',
  'conventions',
  'research',
  'milestones',
  'changes',
  'archive',
  'workspace',
];

/** 创建 specwf/ 目录骨架 */
export function createSpecwfStructure(specwfDir: string): void {
  mkdirSync(specwfDir, { recursive: true });
  for (const dir of SPECWF_DIRS) {
    mkdirSync(join(specwfDir, dir), { recursive: true });
  }
}

/** 检查 specwf/ 是否已初始化 */
export function isInitialized(specwfDir: string): boolean {
  return existsSync(join(specwfDir, 'project.yml')) &&
         existsSync(join(specwfDir, 'state.md'));
}

/** 创建 milestone 目录 */
export function createMilestoneDir(specwfDir: string, milestoneId: string): string {
  const dir = join(specwfDir, 'milestones', milestoneId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 创建 phase 目录 */
export function createPhaseDir(
  specwfDir: string,
  milestoneId: string,
  phaseId: string,
): string {
  const dir = join(specwfDir, 'milestones', milestoneId, 'phases', phaseId);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/** 创建 change 目录 */
export function createChangeDir(
  specwfDir: string,
  milestoneId: string,
  phaseId: string,
  changeName: string,
): string {
  const dir = join(
    specwfDir,
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
export function createAdhocChangeDir(specwfDir: string, changeName: string): string {
  const dir = join(specwfDir, 'changes', changeName);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(dir, 'specs'), { recursive: true });
  return dir;
}

/** 归档 change 到 archive/ */
export function archiveChangeDir(
  specwfDir: string,
  changeDir: string,
): string {
  const changeName = changeDir.split('/').pop() ?? 'unknown';
  const date = new Date().toISOString().slice(0, 10);
  const archiveDir = join(specwfDir, 'archive', `${date}-${changeName}`);
  
  // 移动目录
  if (existsSync(changeDir)) {
    renameSync(changeDir, archiveDir);
  }
  
  return archiveDir;
}

/** 归档 milestone 到 archive/milestones/ */
export function archiveMilestoneDir(
  specwfDir: string,
  milestoneId: string,
): string {
  const sourceDir = join(specwfDir, 'milestones', milestoneId);
  const archiveDir = join(specwfDir, 'archive', 'milestones', milestoneId);
  
  if (!existsSync(sourceDir)) {
    return archiveDir;
  }
  
  mkdirSync(join(specwfDir, 'archive', 'milestones'), { recursive: true });
  
  // 移动整个 milestone 目录
  renameSync(sourceDir, archiveDir);
  
  return archiveDir;
}

// Node fs.renameSync 在目录跨设备时可能失败，用 mv 替代
import { renameSync } from 'node:fs';

/** 列出所有 milestones */
export function listMilestones(specwfDir: string): string[] {
  const dir = join(specwfDir, 'milestones');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** 列出 milestone 下的 phases */
export function listPhases(specwfDir: string, milestoneId: string): string[] {
  const dir = join(specwfDir, 'milestones', milestoneId, 'phases');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** 列出 phase 下的 changes */
export function listChanges(
  specwfDir: string,
  milestoneId: string,
  phaseId: string,
): string[] {
  const dir = join(specwfDir, 'milestones', milestoneId, 'phases', phaseId, 'changes');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** 列出临时 changes */
export function listAdhocChanges(specwfDir: string): string[] {
  const dir = join(specwfDir, 'changes');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}

/** 列出归档的 changes */
export function listArchived(specwfDir: string): string[] {
  const dir = join(specwfDir, 'archive');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((e) => {
    const stat = statSync(join(dir, e));
    return stat.isDirectory();
  });
}
