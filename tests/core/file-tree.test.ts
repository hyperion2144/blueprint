import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  createBlueprintStructure, isInitialized,
  createChangeDir, changeDir, archiveChangeDir,
  listActiveChanges, listArchivedChanges, listSpecDomains,
} from '../../src/core/file-tree.js';

const tmpDir = join(process.cwd(), 'tests/tmp-filetree');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('createBlueprintStructure', () => {
  it('creates directory skeleton', () => {
    createBlueprintStructure(tmpDir);
    expect(existsSync(join(tmpDir, 'specs'))).toBe(true);
    expect(existsSync(join(tmpDir, 'conventions'))).toBe(true);
    expect(existsSync(join(tmpDir, 'changes'))).toBe(true);
    expect(existsSync(join(tmpDir, 'changes', 'archive'))).toBe(true);
    expect(existsSync(join(tmpDir, 'schemas'))).toBe(true);
    // No milestones/ directory in v2
    expect(existsSync(join(tmpDir, 'milestones'))).toBe(false);
  });
});

describe('isInitialized', () => {
  it('returns true when config.yaml exists', () => {
    createBlueprintStructure(tmpDir);
    writeFileSync(join(tmpDir, 'config.yaml'), '', 'utf-8');
    expect(isInitialized(tmpDir)).toBe(true);
  });

  it('returns false when config.yaml missing', () => {
    createBlueprintStructure(tmpDir);
    expect(isInitialized(tmpDir)).toBe(false);
  });
});

describe('createChangeDir + changeDir + archiveChangeDir', () => {
  it('creates change directory under changes/', () => {
    const dir = createChangeDir(tmpDir, 'add-auth');
    expect(existsSync(dir)).toBe(true);
    expect(dir).toContain('changes/add-auth');
  });

  it('changeDir returns correct path', () => {
    const dir = changeDir(tmpDir, 'add-auth');
    expect(dir).toContain('changes/add-auth');
  });

  it('archiveChangeDir moves change to archive', () => {
    createChangeDir(tmpDir, 'add-auth');
    writeFileSync(join(tmpDir, 'changes', 'add-auth', 'proposal.md'), '# test', 'utf-8');

    const archivePath = archiveChangeDir(tmpDir, 'add-auth');
    expect(existsSync(archivePath)).toBe(true);
    expect(existsSync(join(archivePath, 'proposal.md'))).toBe(true);
    // Original is gone
    expect(existsSync(join(tmpDir, 'changes', 'add-auth'))).toBe(false);
  });
});

describe('list functions', () => {
  it('listActiveChanges returns active changes', () => {
    createChangeDir(tmpDir, 'change-a');
    createChangeDir(tmpDir, 'change-b');
    expect(listActiveChanges(tmpDir).sort()).toEqual(['change-a', 'change-b']);
  });

  it('listArchivedChanges returns archived changes', () => {
    createChangeDir(tmpDir, 'change-a');
    writeFileSync(join(tmpDir, 'changes', 'change-a', 'proposal.md'), '# test', 'utf-8');
    archiveChangeDir(tmpDir, 'change-a');
    expect(listArchivedChanges(tmpDir).length).toBeGreaterThanOrEqual(1);
    expect(listArchivedChanges(tmpDir)[0]).toContain('change-a');
    expect(listActiveChanges(tmpDir)).not.toContain('change-a');
  });

  it('listSpecDomains returns spec directories', () => {
    mkdirSync(join(tmpDir, 'specs', 'auth'), { recursive: true });
    mkdirSync(join(tmpDir, 'specs', 'core'), { recursive: true });
    expect(listSpecDomains(tmpDir).sort()).toEqual(['auth', 'core']);
  });

  it('empty directories return empty arrays', () => {
    createBlueprintStructure(tmpDir);
    expect(listActiveChanges(tmpDir)).toEqual([]);
    expect(listArchivedChanges(tmpDir)).toEqual([]);
    expect(listSpecDomains(tmpDir)).toEqual([]);
  });
});
