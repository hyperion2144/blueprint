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
  // Init blueprint project
  execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
  // Seed initial commit
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
    // Create a change with proposal and review
    cli('propose', 'test-change');
    write('bp/changes/test-change/design.md', '# Design\n');
    write('bp/changes/test-change/tasks.md', '# Tasks\n- [x] T-1\n');
    write('bp/changes/test-change/review.md', '## Overall Verdict: PASS\n');
    mkdirSync(join(testDir, 'bp', 'changes', 'test-change', 'specs', 'auth'), { recursive: true });
    write('bp/changes/test-change/specs/auth/auth.md', '# Auth Spec\n');

    execSync('git add -f -A && git commit -m "add test change"', { cwd: testDir });

    const output = cli('archive', 'test-change');
    expect(output).toContain('Archived');

    // Verify original change directory is gone
    expect(existsSync(join(testDir, 'bp/changes/test-change'))).toBe(false);

    // Verify archive exists
    expect(existsSync(join(testDir, 'bp/changes/archive'))).toBe(true);
    const archiveEntries = execSync(`ls -1 ${join(testDir, 'bp/changes/archive')}`, { encoding: 'utf-8' }).trim().split('\n');
    expect(archiveEntries.some((e) => e.includes('test-change'))).toBe(true);
  });
});
