import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
let testDir: string;

function cli(...args: string[]): string {
  return execSync(`node ${cliPath} ${args.join(' ')}`, {
    encoding: 'utf-8', cwd: testDir, timeout: 15000,
  });
}

function write(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

beforeEach(() => {
  testDir = join(tmpdir(), `bp-archive-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(testDir, { recursive: true });
  execSync('git init', { cwd: testDir });
  execSync('git config user.email test@test.com', { cwd: testDir });
  execSync('git config user.name test', { cwd: testDir });
  // Seed initial commit so git operations have a base to work with
  write('seed', '');
  execSync('git add -A', { cwd: testDir });
  execSync('git commit -m "init"', { cwd: testDir });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('bp archive', () => {
  it('archive non-existent change shows error', () => {
    expect(() => cli('archive', 'nonexistent')).toThrow();
  });

  it('archive from invalid path rejected', () => {
    expect(() => cli('archive', '/tmp/evil')).toThrow();
  });

  it('archives a valid change', () => {
    // Setup: state.md with a change entry + change-summary.md on disk
    const stateMd = `---
project:
  name: test
  status: milestone-active
  current_milestone: M1
  current_phase: ph.1
active_context:
  type: change
  ref: changes/test-change
  step: applying
changes:
  - name: test-change
    status: applying
    depends_on: []
adhoc: []
---
# State
`;
    write('bp/state.md', stateMd);
    write('bp/changes/test-change/change-summary.md', '# Change Summary: test-change\n\nchange completed.\n');
    write('bp/changes/test-change/specs/auth.md', '# Auth Spec\n\nN/A\n');

    // Commit so the repo tracks these files (git rm step is best-effort)
    execSync('git add -A', { cwd: testDir });
    execSync('git commit -m "add test change"', { cwd: testDir });

    const output = cli('archive', 'bp/changes/test-change');

    expect(output).toContain('\u2713 state.md updated');
    expect(output).toContain('\u2713 Archived to:');

    // Verify original change directory is gone
    expect(existsSync(join(testDir, 'bp/changes/test-change'))).toBe(false);

    // Verify archive exists — adhoc style since the path has no 'milestones/' segment
    const date = new Date().toISOString().slice(0, 10);
    const archivePath = join(testDir, 'bp/archive/changes', `${date}-test-change`);
    expect(existsSync(archivePath)).toBe(true);
    expect(existsSync(join(archivePath, 'change-summary.md'))).toBe(true);
    expect(existsSync(join(archivePath, 'specs', 'auth.md'))).toBe(true);

    // Verify state.md has a completed section (the change was removed from changes and added to completed)
    const updatedState = readFileSync(join(testDir, 'bp/state.md'), 'utf-8');
    expect(updatedState).toContain('completed:');
  });
});
