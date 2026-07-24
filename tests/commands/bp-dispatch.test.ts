import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
const testDir = join(tmpdir(), `bp-dispatch-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
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

describe('bp dispatch Codex platform (T-7)', () => {
  const codexTestDir = join(tmpdir(), `bp-dispatch-codex-${Date.now()}`);
  const codexBpDir = join(codexTestDir, 'bp');

  beforeAll(() => {
    mkdirSync(codexTestDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${codexTestDir} --yes`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    // Replace platform: [omp] with platform: [codex] in config
    const cfg = readFileSync(join(codexBpDir, 'config.yaml'), 'utf-8');
    const updated = cfg.replace(/platform:\n  - omp\n/, 'platform:\n  - codex\n');
    writeFileSync(join(codexBpDir, 'config.yaml'), updated, 'utf-8');
  });

  afterAll(() => {
    rmSync(codexTestDir, { recursive: true, force: true });
  });

  it('Codex executor output declares isolation type none', () => {
    const output = execSync(`node ${cliPath} dispatch executor --change demo`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    expect(output).toContain('- Type: none');
    expect(output).not.toContain('- Type: param');
    expect(output).toContain('- Support: no');
  });

  it('Codex executor output instructs `git worktree add`', () => {
    const output = execSync(`node ${cliPath} dispatch executor --change demo`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    expect(output).toContain('git worktree add');
  });

  it('Codex executor output uses the `task` dispatch tool', () => {
    const output = execSync(`node ${cliPath} dispatch executor --change demo`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    expect(output).toMatch(/`task`/);
  });

  it('Codex executor output identifies bp-executor agent', () => {
    const output = execSync(`node ${cliPath} dispatch executor --change demo`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    expect(output).toContain('bp-executor');
  });
});
