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
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
  );

  it('specwf --version', () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
    expect(output.trim()).toBe(pkg.version);
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
    const state = JSON.parse(output);
    expect(state.project).toBe('specwf');
    expect(state.status).toBeTruthy();
    expect(state.phase).toBeDefined();
  });

  it('specwf list', () => {
    const output = execSync(`node ${cliPath} list`, { encoding: 'utf-8', cwd: process.cwd() });
    expect(output).toContain('Milestones:');
    expect(output).toContain('m1-core/');
  });

  it('specwf continue 显示下一步', () => {
    const output = execSync(`node ${cliPath} continue`, { encoding: 'utf-8', cwd: process.cwd() });
    const result = JSON.parse(output);
    expect(result.current).toBeDefined();
    expect(result.current.context).toBeTruthy();
    expect(result.current.step).toBeTruthy();
  });

  it('specwf config list', () => {
    const output = execSync(`node ${cliPath} config`, { encoding: 'utf-8', cwd: process.cwd() });
    expect(output).toContain('version');
    expect(output).toContain('profile');
  });
});
