import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stringifyFrontmatter } from '../../src/parser/frontmatter.js';

const cliPath = join(process.cwd(), 'bin/bp.js');

const testDir = join(tmpdir(), `bp-int-test-${Date.now()}`);
const tmpTemplateDir = join(tmpdir(), `bp-tpl-test-${Date.now()}`);

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
  rmSync(tmpTemplateDir, { recursive: true, force: true });
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
    mkdirSync(testDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });

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

  it('bp state 读取自身状态', () => {
    const output = execSync(`node ${cliPath} state`, { encoding: 'utf-8', cwd: process.cwd() });
    const state = JSON.parse(output);
    expect(state.project).toBe('blueprint');
    expect(state.status).toBeTruthy();
    expect(state.phase).toBeDefined();
  });

  it('bp list', () => {
    const output = execSync(`node ${cliPath} list`, { encoding: 'utf-8', cwd: process.cwd() });
    expect(output).toContain('Milestones:');
    expect(output).toContain('m1-core/');
  });

  it('bp continue 显示下一步', () => {
    const output = execSync(`node ${cliPath} continue`, { encoding: 'utf-8', cwd: process.cwd() });
    const result = JSON.parse(output);
    // May return current+next (project/phase) or hint+pending (change/adhoc)
    expect(result.current || result.hint).toBeDefined();
  });

  it('bp config list', () => {
    const output = execSync(`node ${cliPath} config`, { encoding: 'utf-8', cwd: process.cwd() });
    expect(output).toContain('version');
    expect(output).toContain('profile');
  });
});
