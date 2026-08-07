/**
 * bp refactor CLI (T-10) — instructions output + analyze subcommand.
 *
 * Exercises the built `bin/cli.js` against an initialized temp project.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
const testDir = join(tmpdir(), `refactor-cli-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('bp refactor <target> (T-10)', () => {
  it('prints the full refactor step instructions and exits 0', () => {
    const res = spawnSync(process.execPath, [cliPath, 'refactor', 'src/core'], {
      cwd: testDir,
      encoding: 'utf-8',
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('## Input');
    expect(res.stdout).toContain('## Steps');
    expect(res.stdout).toContain('## Output');
    expect(res.stdout).toContain('## Guardrails');
  });

  it('prints a usage error and exits 1 for an empty target', () => {
    const res = spawnSync(process.execPath, [cliPath, 'refactor', ''], {
      cwd: testDir,
      encoding: 'utf-8',
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('Usage: bp refactor <target>');
  });

  it('exits 1 when no bp/ project is present', () => {
    const res = spawnSync(process.execPath, [cliPath, 'refactor', 'src/core'], {
      cwd: tmpdir(),
      encoding: 'utf-8',
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('Not in a blueprint project. Run "bp init" first.');
  });
});

describe('bp refactor analyze <target> (T-10)', () => {
  it('writes bp/.refactor-report.md and prints the stdout summary line', () => {
    const res = spawnSync(process.execPath, [cliPath, 'refactor', 'analyze', 'src/core'], {
      cwd: testDir,
      encoding: 'utf-8',
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('Refactor report for src/core:');

    const reportPath = join(testDir, 'bp', '.refactor-report.md');
    expect(existsSync(reportPath)).toBe(true);
    const report = readFileSync(reportPath, 'utf-8');
    expect(report).toContain('# Refactor Report');
    expect(report).toContain('## Summary');
  });

  it('exits 1 with a clear stderr message for a target that resolves to no module (Q3)', () => {
    const res = spawnSync(process.execPath, [cliPath, 'refactor', 'analyze', 'src/nope'], {
      cwd: testDir,
      encoding: 'utf-8',
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('src/nope');
    expect(res.stderr).toMatch(/no module|does not match/i);
  });
});
