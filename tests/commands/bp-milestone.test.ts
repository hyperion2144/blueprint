import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
const testDir = join(tmpdir(), `bp-milestone-test-${Date.now()}`);

function cli(...args: string[]): string {
  return execSync(`node ${cliPath} ${args.join(' ')}`, {
    encoding: 'utf-8', cwd: testDir, timeout: 15000,
  });
}

function write(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function getState(): Record<string, unknown> {
  const matter = require('gray-matter');
  return matter(readFileSync(join(testDir, 'bp/state.md'), 'utf-8')).data;
}

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });

  // Init git so git rm works after archiving
  execSync('git init', { cwd: testDir, encoding: 'utf-8' });
  execSync('git config user.email test@test.com', { cwd: testDir, encoding: 'utf-8' });
  execSync('git config user.name test', { cwd: testDir, encoding: 'utf-8' });

  // Create bp project with milestone state
  write('bp/project.yml', 'profile: default\n');
  write('bp/state.md', `---
project:
  name: test
  status: milestone-active
  current_milestone: M1-test
  current_phase: null
active_context:
  type: milestone
  ref: milestones/M1-test
  step: active
changes: []
adhoc: []
---
# State
`);

  // Create milestone directory with a phase inside
  mkdirSync(join(testDir, 'bp/milestones/M1-test/phases/ph.1-start'), { recursive: true });

  // Write a placeholder file so the phase dir isn't empty (git tracks it)
  write('bp/milestones/M1-test/phases/ph.1-start/PLAN.md', '# Plan\n');

  // Initial commit so `git rm` in archiveHandler works
  execSync('git add -A', { cwd: testDir, encoding: 'utf-8' });
  execSync('git commit -m "init"', { cwd: testDir, encoding: 'utf-8' });
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('bp milestone archive', () => {
  it('milestone archive moves dir to archive/milestones/', () => {
    const output = cli('milestone', 'archive', 'M1-test');
    const parsed = JSON.parse(output);
    expect(parsed.ok).toBe(true);
    expect(parsed.archived).toContain('archive/milestones/M1-test');

    // Source directory should be removed
    expect(existsSync(join(testDir, 'bp/milestones/M1-test'))).toBe(false);
    // Archive destination should exist with phase preserved
    expect(existsSync(join(testDir, 'bp/archive/milestones/M1-test'))).toBe(true);
    expect(existsSync(join(testDir, 'bp/archive/milestones/M1-test/phases/ph.1-start'))).toBe(true);
  });

  it('archive updates state.md', () => {
    const state = getState();

    // Milestone is cleared and status transitions to milestone-shipped
    expect(state.project.current_milestone).toBeNull();
    expect(state.project.current_phase).toBeNull();
    expect(state.project.status).toBe('milestone-shipped');
    expect(state.active_context.type).toBe('project');
    expect(state.active_context.step).toBe('milestone-shipped');
  });

  it('invalid id rejected', () => {
    // After archiving above, bp/archive/ exists, so id='..' resolves
    // to bp/archive/ as the destination and hits "already exists" error.
    // The process must NOT crash with an unhandled exception.
    const output = cli('milestone', 'archive', '..');
    expect(output).toContain('error');
  });
});
