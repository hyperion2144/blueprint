import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createBlueprintStructure, isInitialized, createMilestoneDir, createPhaseDir, createChangeDir, createAdhocChangeDir, listMilestones, listPhases, listChanges, listAdhocChanges, listArchived } from '../../src/core/file-tree.js';

const tmpDir = join(process.cwd(), 'tests/tmp-filetree');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('createBlueprintStructure', () => {
  it('创建完整目录骨架', () => {
    createBlueprintStructure(tmpDir);
    expect(existsSync(join(tmpDir, 'specs'))).toBe(true);
    expect(existsSync(join(tmpDir, 'conventions'))).toBe(true);
    expect(existsSync(join(tmpDir, 'milestones'))).toBe(true);
    expect(existsSync(join(tmpDir, 'archive'))).toBe(true);
  });
});

describe('createMilestoneDir + createPhaseDir + createChangeDir', () => {
  it('创建嵌套目录结构', () => {
    createMilestoneDir(tmpDir, 'm1');
    createPhaseDir(tmpDir, 'm1', 'p1');
    const changeDir = createChangeDir(tmpDir, 'm1', 'p1', 'add-auth');

    expect(existsSync(join(tmpDir, 'milestones', 'm1'))).toBe(true);
    expect(existsSync(join(tmpDir, 'milestones', 'm1', 'phases', 'p1'))).toBe(true);
    expect(existsSync(changeDir)).toBe(true);
    expect(existsSync(join(changeDir, 'specs'))).toBe(true);
  });
});

describe('createAdhocChangeDir', () => {
  it('创建临时 change 目录', () => {
    const dir = createAdhocChangeDir(tmpDir, 'fix-typo');
    expect(existsSync(dir)).toBe(true);
    expect(existsSync(join(dir, 'specs'))).toBe(true);
  });
});

describe('list functions', () => {
  it('列出 milestones/phases/changes', () => {
    createChangeDir(tmpDir, 'm1', 'p1', 'change-a');
    createChangeDir(tmpDir, 'm1', 'p1', 'change-b');
    createChangeDir(tmpDir, 'm1', 'p2', 'change-c');
    createAdhocChangeDir(tmpDir, 'adhoc-1');

    expect(listMilestones(tmpDir)).toContain('m1');
    expect(listPhases(tmpDir, 'm1').sort()).toEqual(['p1', 'p2']);
    expect(listChanges(tmpDir, 'm1', 'p1').sort()).toEqual(['change-a', 'change-b']);
    expect(listAdhocChanges(tmpDir)).toContain('adhoc-1');
  });

  it('空目录返回空数组', () => {
    expect(listMilestones(tmpDir)).toEqual([]);
    expect(listAdhocChanges(tmpDir)).toEqual([]);
    expect(listArchived(tmpDir)).toEqual([]);
  });
});
