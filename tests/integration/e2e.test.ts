import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/specwf.js');
const testDir = join(tmpdir(), `specwf-e2e-${Date.now()}`);

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('E2E: init → template → archive', () => {
  it('step 1: specwf init 创建完整项目结构', () => {
    mkdirSync(testDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });

    const specwfDir = join(testDir, 'specwf');
    expect(existsSync(join(specwfDir, 'project.yml'))).toBe(true);
    expect(existsSync(join(specwfDir, 'state.md'))).toBe(true);
    expect(existsSync(join(specwfDir, 'specs'))).toBe(true);
    expect(existsSync(join(specwfDir, 'conventions'))).toBe(true);
    expect(existsSync(join(specwfDir, 'milestones'))).toBe(true);
    expect(existsSync(join(specwfDir, 'changes'))).toBe(true);
    expect(existsSync(join(specwfDir, 'archive'))).toBe(true);
    expect(existsSync(join(specwfDir, 'workspace'))).toBe(true);
  });

  it('step 2: specwf update 生成平台文件', () => {
    execSync(`node ${cliPath} update`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(testDir, '.omp', 'commands', 'specwf-plan.md'))).toBe(true);
    expect(existsSync(join(testDir, '.omp', 'agents', 'specwf-planner.md'))).toBe(true);
    expect(existsSync(join(testDir, '.omp', 'skills', 'specwf-plan', 'SKILL.md'))).toBe(true);

    const cmdCount = execSync(`ls -1 ${join(testDir, '.omp', 'commands')} | wc -l`, { encoding: 'utf-8' }).trim();
    expect(parseInt(cmdCount)).toBe(16);

    const agentCount = execSync(`ls -1 ${join(testDir, '.omp', 'agents')} | wc -l`, { encoding: 'utf-8' }).trim();
    expect(parseInt(agentCount)).toBe(8);
  });

  it('step 3: specwf template proposal 生成 proposal.md', () => {
    execSync(`node ${cliPath} template proposal --name add-auth`, { encoding: 'utf-8', cwd: testDir });

    const proposalPath = join(testDir, 'specwf', 'changes', 'add-auth', 'proposal.md');
    expect(existsSync(proposalPath)).toBe(true);
    const content = readFileSync(proposalPath, 'utf-8');
    expect(content).toContain('add-auth');
    expect(content).toContain('Intent');
    expect(content).toContain('Scope');
  });

  it('step 4: specwf template design 生成 design.md', () => {
    execSync(`node ${cliPath} template design --name add-auth`, { encoding: 'utf-8', cwd: testDir });

    const designPath = join(testDir, 'specwf', 'changes', 'add-auth', 'design.md');
    expect(existsSync(designPath)).toBe(true);
    const content = readFileSync(designPath, 'utf-8');
    expect(content).toContain('add-auth');
    expect(content).toContain('技术方案');
  });

  it('step 5: specwf template tasks 生成 tasks.md', () => {
    execSync(`node ${cliPath} template tasks --name add-auth`, { encoding: 'utf-8', cwd: testDir });

    const tasksPath = join(testDir, 'specwf', 'changes', 'add-auth', 'tasks.md');
    expect(existsSync(tasksPath)).toBe(true);
    const content = readFileSync(tasksPath, 'utf-8');
    expect(content).toContain('TDD');
    expect(content).toContain('type:behavior');
  });

  it('step 6: specwf archive delta-spec 合并', () => {
    const specwfDir = join(testDir, 'specwf');
    const changeDir = join(specwfDir, 'changes', 'add-auth');

    // 创建 delta-spec
    mkdirSync(join(changeDir, 'specs', 'auth'), { recursive: true });
    writeFileSync(
      join(changeDir, 'specs', 'auth', 'spec.md'),
      `# Auth Specification\n\n## Purpose\n\n认证管理。\n\n## Requirements\n\n### Requirement: Login\n\n系统 SHALL 提供登录功能。\n\n#### Scenario: Valid login\n- GIVEN a registered user\n- WHEN the user submits valid credentials\n- THEN a session token is returned\n`,
      'utf-8',
    );

    // 创建全局 spec（已有内容）
    mkdirSync(join(specwfDir, 'specs', 'auth'), { recursive: true });
    writeFileSync(
      join(specwfDir, 'specs', 'auth', 'spec.md'),
      `# Auth Specification\n\n## Purpose\n\n认证管理。\n\n## Requirements\n\n### Requirement: Logout\n\n系统 SHALL 提供登出功能。\n`,
      'utf-8',
    );

    // 执行 archive
    execSync(`node ${cliPath} archive specwf/changes/add-auth`, { encoding: 'utf-8', cwd: testDir });

    // 验证归档
    const archiveEntries = execSync(`ls -1 ${join(specwfDir, 'archive')}`, { encoding: 'utf-8' }).trim().split('\n');
    expect(archiveEntries.some((e) => e.includes('add-auth'))).toBe(true);

    // 验证 delta-spec 合并
    const mergedSpec = readFileSync(join(specwfDir, 'specs', 'auth', 'spec.md'), 'utf-8');
    expect(mergedSpec).toContain('Logout');
    expect(mergedSpec).toContain('Login');
    expect(mergedSpec).toContain('Valid login');
  });

  it('step 7: specwf continue 输出下一步', () => {
    const output = execSync(`node ${cliPath} continue`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('当前位置');
    expect(output).toContain('当前步骤');
  });

  it('step 8: specwf list 输出归档', () => {
    const output = execSync(`node ${cliPath} list --all`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('归档');
    expect(output).toContain('add-auth');
  });
});
