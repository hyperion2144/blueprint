import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');

const testDir = join(tmpdir(), `bp-int-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
  // Create a milestone + phase + change for list test
  execSync(`node ${cliPath} state set-milestone test-ms`, { encoding: 'utf-8', cwd: testDir });
  execSync(`node ${cliPath} state set-phase ph.1-test`, { encoding: 'utf-8', cwd: testDir });
  mkdirSync(join(testDir, 'bp', 'milestones', 'test-ms', 'phases', 'ph.1-test', 'changes'), { recursive: true });
  execSync(`node ${cliPath} change new test-change --milestone test-ms --phase ph.1-test`, { encoding: 'utf-8', cwd: testDir });
});

describe('bp integration', () => {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
  );

  it('bp --version', () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
    expect(output.trim()).toBe(pkg.version);
  });

  it('bp init 创建项目结构', () => {
    const bpDir = join(testDir, 'bp');
    expect(existsSync(join(bpDir, 'project.yml'))).toBe(true);
    expect(existsSync(join(bpDir, 'state.md'))).toBe(true);
    expect(existsSync(join(bpDir, 'specs'))).toBe(true);
    expect(existsSync(join(bpDir, 'conventions'))).toBe(true);
    expect(existsSync(join(bpDir, 'milestones'))).toBe(true);

    const config = readFileSync(join(bpDir, 'project.yml'), 'utf-8');
    expect(config).toContain('profile: standard');

    const state = readFileSync(join(bpDir, 'state.md'), 'utf-8');
    expect(state).toContain('project:');
    expect(state).toContain('name:');
  });

  it('bp state 读取状态', () => {
    const output = execSync(`node ${cliPath} state`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('project:');
    expect(output).toContain('status:');
    expect(output).toContain('step:');
  });

  it('bp list 列出里程碑', () => {
    const output = execSync(`node ${cliPath} list`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Milestones:');
  });

  it('bp continue 显示下一步', () => {
    const output = execSync(`node ${cliPath} continue`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('bp continue');
    expect(output).toMatch(/step:|hint:/);
  });

  it('bp config 查看配置', () => {
    const output = execSync(`node ${cliPath} config`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('version');
    expect(output).toContain('profile');
  });
});
