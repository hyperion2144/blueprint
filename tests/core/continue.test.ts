import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { checkArtifacts, getChangeProgress, determineNextStepForChange } from '../../src/core/continue.js';
import { createBlueprintStructure, createChangeDir } from '../../src/core/file-tree.js';

const tmpDir = join(process.cwd(), 'tests/tmp-continue');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
  createBlueprintStructure(tmpDir);
  writeFileSync(join(tmpDir, 'config.yaml'), '', 'utf-8');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeArtifact(changeName: string, file: string, content = '# test\n'): void {
  const dir = createChangeDir(tmpDir, changeName);
  writeFileSync(join(dir, file), content, 'utf-8');
}

describe('checkArtifacts', () => {
  it('returns all false for new change', () => {
    createChangeDir(tmpDir, 'test-change');
    const artifacts = checkArtifacts(tmpDir, 'test-change');
    expect(artifacts.proposal).toBe(false);
    expect(artifacts.design).toBe(false);
    expect(artifacts.tasks).toBe(false);
    expect(artifacts.specs).toBe(false);
    expect(artifacts.review).toBe(false);
    expect(artifacts.tasksTotal).toBe(0);
    expect(artifacts.allTasksDone).toBe(false);
  });

  it('detects proposal artifact', () => {
    writeArtifact('test-change', 'proposal.md');
    const artifacts = checkArtifacts(tmpDir, 'test-change');
    expect(artifacts.proposal).toBe(true);
    expect(artifacts.design).toBe(false);
  });

  it('detects all artifacts present', () => {
    writeArtifact('test-change', 'proposal.md');
    writeArtifact('test-change', 'design.md');
    writeArtifact('test-change', 'tasks.md', '- [ ] T-1\n- [x] T-2\n');
    mkdirSync(join(tmpDir, 'changes', 'test-change', 'specs'), { recursive: true });
    writeArtifact('test-change', 'review.md');
    const artifacts = checkArtifacts(tmpDir, 'test-change');
    expect(artifacts.proposal).toBe(true);
    expect(artifacts.design).toBe(true);
    expect(artifacts.tasks).toBe(true);
    expect(artifacts.specs).toBe(true);
    expect(artifacts.review).toBe(true);
    expect(artifacts.tasksTotal).toBe(2);
    expect(artifacts.tasksCompleted).toBe(1);
    expect(artifacts.allTasksDone).toBe(false);
  });

  it('detects all tasks done', () => {
    writeArtifact('test-change', 'tasks.md', '- [x] T-1\n- [x] T-2\n');
    const artifacts = checkArtifacts(tmpDir, 'test-change');
    expect(artifacts.tasksTotal).toBe(2);
    expect(artifacts.tasksCompleted).toBe(2);
    expect(artifacts.allTasksDone).toBe(true);
  });
});

describe('getChangeProgress', () => {
  it('returns null for non-existent change', () => {
    expect(getChangeProgress(tmpDir, 'nonexistent')).toBeNull();
  });

  it('returns proposed stage when only proposal exists', () => {
    writeArtifact('test-change', 'proposal.md');
    const progress = getChangeProgress(tmpDir, 'test-change');
    expect(progress).not.toBeNull();
    expect(progress!.name).toBe('test-change');
    expect(progress!.stage).toBe('proposed');
  });

  it('returns in-progress when tasks partially done', () => {
    writeArtifact('test-change', 'proposal.md');
    writeArtifact('test-change', 'design.md');
    writeArtifact('test-change', 'tasks.md', '- [ ] T-1\n- [x] T-2\n');
    const progress = getChangeProgress(tmpDir, 'test-change');
    expect(progress).not.toBeNull();
    expect(progress!.stage).toBe('in-progress');
  });

  it('returns reviewed when review passes', () => {
    writeArtifact('test-change', 'proposal.md');
    writeArtifact('test-change', 'design.md');
    writeArtifact('test-change', 'tasks.md', '- [x] T-1\n');
    writeArtifact('test-change', 'review.md', '## Overall Verdict: PASS\n');
    const progress = getChangeProgress(tmpDir, 'test-change');
    expect(progress).not.toBeNull();
    expect(progress!.stage).toBe('reviewed');
    expect(progress!.reviewVerdict).toBe('PASS');
  });
});

describe('determineNextStepForChange', () => {
  it('no active changes returns roadmap hint', () => {
    const result = determineNextStepForChange(tmpDir);
    expect(result.changeName).toBeNull();
    expect(result.nextStep).not.toBeNull();
    expect(result.nextStep!.command).toBe('bp roadmap');
    expect(result.activeChanges).toEqual([]);
  });

  it('with change name and no proposal suggests propose', () => {
    createChangeDir(tmpDir, 'test-change');
    const result = determineNextStepForChange(tmpDir, 'test-change');
    expect(result.changeName).toBe('test-change');
    expect(result.nextStep).not.toBeNull();
    expect(result.nextStep!.command).toContain('propose');
  });

  it('with proposal suggests plan', () => {
    writeArtifact('test-change', 'proposal.md');
    const result = determineNextStepForChange(tmpDir, 'test-change');
    expect(result.nextStep).not.toBeNull();
    expect(result.nextStep!.command).toContain('plan');
  });

  it('with design and tasks suggests apply', () => {
    writeArtifact('test-change', 'proposal.md');
    writeArtifact('test-change', 'design.md');
    writeArtifact('test-change', 'tasks.md', '- [ ] T-1\n');
    const result = determineNextStepForChange(tmpDir, 'test-change');
    expect(result.nextStep).not.toBeNull();
    expect(result.nextStep!.command).toContain('apply');
  });

  it('all tasks done without review suggests review', () => {
    writeArtifact('test-change', 'proposal.md');
    writeArtifact('test-change', 'design.md');
    writeArtifact('test-change', 'tasks.md', '- [x] T-1\n');
    const result = determineNextStepForChange(tmpDir, 'test-change');
    expect(result.nextStep).not.toBeNull();
    expect(result.nextStep!.command).toContain('review');
  });

  it('review passed suggests archive', () => {
    writeArtifact('test-change', 'proposal.md');
    writeArtifact('test-change', 'design.md');
    writeArtifact('test-change', 'tasks.md', '- [x] T-1\n');
    writeArtifact('test-change', 'review.md', '## Overall Verdict: PASS\n');
    const result = determineNextStepForChange(tmpDir, 'test-change');
    expect(result.nextStep).not.toBeNull();
    expect(result.nextStep!.command).toContain('archive');
  });

  it('single active change auto-selects', () => {
    writeArtifact('test-change', 'proposal.md');
    const result = determineNextStepForChange(tmpDir);
    expect(result.changeName).toBe('test-change');
    expect(result.nextStep).not.toBeNull();
  });

  it('multiple active changes returns list', () => {
    writeArtifact('change-a', 'proposal.md');
    writeArtifact('change-b', 'proposal.md');
    const result = determineNextStepForChange(tmpDir);
    expect(result.changeName).toBeNull();
    expect(result.activeChanges.sort()).toEqual(['change-a', 'change-b']);
    expect(result.nextStep).toBeNull();
  });

  it('non-existent change returns empty result', () => {
    const result = determineNextStepForChange(tmpDir, 'nonexistent');
    expect(result.progress).toBeNull();
  });
});
