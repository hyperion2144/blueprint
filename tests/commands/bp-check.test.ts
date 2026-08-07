/**
 * bp-check.test.ts — `bp check` command (renamed from `bp review`)
 *
 * T-4 RED: GIVEN an initialized bp project with a fully-implemented change
 *          WHEN `bp check <name>` runs
 *          THEN stdout contains the check workflow instructions
 *               AND `bp review <name>` is an unknown command (non-zero exit).
 *
 * Spec: specs/templates/spec.md#Check-Step-Rename
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
let testDir: string;

function write(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

describe('bp check command (review renamed to check)', () => {
  beforeAll(() => {
    testDir = join(tmpdir(), `bp-check-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('bp check prints the check workflow instructions for a fully implemented change', () => {
    write('bp/changes/test-change/proposal.md', '# Proposal\n');
    write('bp/changes/test-change/design.md', '# Design\n');
    write('bp/changes/test-change/tasks.md', '# Tasks\n- [x] T-1\n');
    mkdirSync(join(testDir, 'bp', 'changes', 'test-change', 'specs'), { recursive: true });

    const output = execSync(`node ${cliPath} check test-change`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Change: test-change');
    expect(output).toContain('bp dispatch fixer');
    expect(output).toContain('## Guardrails');
  });

  it('bp review is an unknown command', () => {
    expect(() =>
      execSync(`node ${cliPath} review test-change`, { encoding: 'utf-8', cwd: testDir }),
    ).toThrow();
  });
});
