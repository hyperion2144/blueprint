/**
 * bp-design-commands.test.ts — five design CLI command tests
 *
 * T-4 RED: GIVEN an initialized bp project at a temp directory
 *          WHEN `bp design`, `bp design-html`, `bp design-review`,
 *               `bp design-shotgun`, and `bp plan-design-review` each run
 *          THEN each prints non-empty instructions containing `## Steps`
 *               and exits 0, and `bp --help` lists all five commands.
 *          GIVEN a directory without a bp/ folder
 *          WHEN `bp design` runs there
 *          THEN stderr contains the not-in-project error and exit code is 1.
 *
 * Spec: specs/design/spec.md#Design-CLI-Commands
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
const COMMANDS = ['design', 'design-html', 'design-review', 'design-shotgun', 'plan-design-review'];

const testDir = join(tmpdir(), `bp-design-commands-${Date.now()}`);

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('bp design* commands (T-4)', () => {
  it('each command prints non-empty instructions containing ## Steps and exits 0', () => {
    for (const command of COMMANDS) {
      const res = spawnSync(process.execPath, [cliPath, command], { encoding: 'utf-8', cwd: testDir });
      expect(res.status, command).toBe(0);
      expect(res.stdout.length, command).toBeGreaterThan(100);
      expect(res.stdout, command).toContain('## Steps');
      expect(res.stdout, command).toContain('## Guardrails');
    }
  });

  it('bp --help lists all five command names', () => {
    const output = execSync(`node ${cliPath} --help`, { encoding: 'utf-8', cwd: testDir });
    for (const command of COMMANDS) {
      expect(output, command).toContain(command);
    }
  });

  it('accepts an optional change-name positional', () => {
    const res = spawnSync(process.execPath, [cliPath, 'design-review', 'demo-change'], {
      encoding: 'utf-8',
      cwd: testDir,
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('## Steps');
  });

  it('fails cleanly outside a project with exit 1 and the not-in-project error', () => {
    const bare = join(tmpdir(), `bp-design-commands-bare-${Date.now()}`);
    mkdirSync(bare, { recursive: true });
    try {
      const res = spawnSync(process.execPath, [cliPath, 'design'], { encoding: 'utf-8', cwd: bare });
      expect(res.status).toBe(1);
      expect(res.stderr).toContain('Not in a blueprint project. Run "bp init" first.');
    } finally {
      rmSync(bare, { recursive: true, force: true });
    }
  });
});
