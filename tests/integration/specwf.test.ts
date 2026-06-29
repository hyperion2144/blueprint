import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stringifyFrontmatter } from '../../src/parser/frontmatter.js';

const cliPath = join(process.cwd(), 'bin/specwf.js');

const testDir = join(tmpdir(), `specwf-int-test-${Date.now()}`);
const tmpTemplateDir = join(tmpdir(), `specwf-tpl-test-${Date.now()}`);

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
  rmSync(tmpTemplateDir, { recursive: true, force: true });
});

describe('specwf integration', () => {
  it('specwf --version', () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
    expect(output.trim()).toBe('0.1.0');
  });

  it('specwf init 创建项目结构', () => {
    mkdirSync(testDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });

    const specwfDir = join(testDir, 'specwf');
    expect(existsSync(join(specwfDir, 'project.yml'))).toBe(true);
    expect(existsSync(join(specwfDir, 'state.md'))).toBe(true);
    expect(existsSync(join(specwfDir, 'specs'))).toBe(true);
    expect(existsSync(join(specwfDir, 'conventions'))).toBe(true);
    expect(existsSync(join(specwfDir, 'milestones'))).toBe(true);

    const config = readFileSync(join(specwfDir, 'project.yml'), 'utf-8');
    expect(config).toContain('profile: standard');

    const state = readFileSync(join(specwfDir, 'state.md'), 'utf-8');
    expect(state).toContain('project:');
    expect(state).toContain('name:');
  });

  it('specwf state 读取自身状态', () => {
    const output = execSync(`node ${cliPath} state`, { encoding: 'utf-8', cwd: process.cwd() });
    expect(output).toContain('项目: specwf');
    expect(output).toContain('状态:');
    expect(output).toContain('Phase:');
  });

  it('specwf list', () => {
    const output = execSync(`node ${cliPath} list`, { encoding: 'utf-8', cwd: process.cwd() });
    expect(output).toContain('Milestones:');
    expect(output).toContain('m1-core/');
  });

  it('specwf continue 显示下一步', () => {
    const output = execSync(`node ${cliPath} continue`, { encoding: 'utf-8', cwd: process.cwd() });
    expect(output).toContain('当前位置');
    expect(output).toContain('当前步骤');
  });

  it('specwf config list', () => {
    const output = execSync(`node ${cliPath} config`, { encoding: 'utf-8', cwd: process.cwd() });
    expect(output).toContain('version');
    expect(output).toContain('profile');
  });
});
