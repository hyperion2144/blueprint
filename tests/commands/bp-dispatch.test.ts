import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
const testDir = join(tmpdir(), `bp-dispatch-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
  // Default platform is omp after init --yes
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('bp dispatch role-based isolation', () => {
  it('planner output has Type: none', () => {
    const output = execSync(`node ${cliPath} dispatch planner`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('- Type: none');
    expect(output).not.toContain('- Type: param');
    expect(output).not.toContain('- Support: yes');
    expect(output).toContain('- Support: no');
  });

  it('executor output has Type: param', () => {
    const output = execSync(`node ${cliPath} dispatch executor`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('- Type: param');
    expect(output).toContain('- Support: yes');
  });

  it('reviewer output has Type: none', () => {
    const output = execSync(`node ${cliPath} dispatch reviewer`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('- Type: none');
    expect(output).not.toContain('- Type: param');
  });

  it('researcher output has Type: none', () => {
    const output = execSync(`node ${cliPath} dispatch researcher`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('- Type: none');
    expect(output).not.toContain('- Type: param');
  });
});
