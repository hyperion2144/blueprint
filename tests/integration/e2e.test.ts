import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/bp.js');
const testDir = join(tmpdir(), `bp-e2e-${Date.now()}`);

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('E2E: init → template → archive', () => {
  it('step 1: bp init 创建完整项目结构', () => {
    mkdirSync(testDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });

    const bpDir = join(testDir, 'bp');
    expect(existsSync(join(bpDir, 'project.yml'))).toBe(true);
    expect(existsSync(join(bpDir, 'state.md'))).toBe(true);
    expect(existsSync(join(bpDir, 'specs'))).toBe(true);
    expect(existsSync(join(bpDir, 'conventions'))).toBe(true);
    expect(existsSync(join(bpDir, 'milestones'))).toBe(true);
    expect(existsSync(join(bpDir, 'changes'))).toBe(true);
    expect(existsSync(join(bpDir, 'archive'))).toBe(true);
    expect(existsSync(join(bpDir, 'workspace'))).toBe(true);
  });

  it('step 2: bp update 生成平台文件', () => {
    execSync(`node ${cliPath} update`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(testDir, '.omp', 'commands', 'bp-plan.md'))).toBe(true);
    expect(existsSync(join(testDir, '.omp', 'agents', 'bp-planner.md'))).toBe(true);
    expect(existsSync(join(testDir, '.omp', 'skills', 'bp-plan', 'SKILL.md'))).toBe(true);

    const cmdCount = execSync(`ls -1 ${join(testDir, '.omp', 'commands')} | wc -l`, { encoding: 'utf-8' }).trim();
    expect(parseInt(cmdCount)).toBe(17);

    const agentCount = execSync(`ls -1 ${join(testDir, '.omp', 'agents')} | wc -l`, { encoding: 'utf-8' }).trim();
    expect(parseInt(agentCount)).toBe(7);
  });

  it('step 3: bp template proposal 生成 proposal.md', () => {
    execSync(`node ${cliPath} template proposal --name add-auth`, { encoding: 'utf-8', cwd: testDir });

    const proposalPath = join(testDir, 'bp', 'changes', 'add-auth', 'proposal.md');
    expect(existsSync(proposalPath)).toBe(true);
    const content = readFileSync(proposalPath, 'utf-8');
    expect(content).toContain('add-auth');
    expect(content).toContain('Intent');
    expect(content).toContain('Scope');
  });

  it('step 4: bp template design 生成 design.md', () => {
    execSync(`node ${cliPath} template design --name add-auth`, { encoding: 'utf-8', cwd: testDir });

    const designPath = join(testDir, 'bp', 'changes', 'add-auth', 'design.md');
    expect(existsSync(designPath)).toBe(true);
    const content = readFileSync(designPath, 'utf-8');
    expect(content).toContain('add-auth');
    expect(content).toContain('Technical Approach');
  });

  it('step 5: bp template tasks 生成 tasks.md', () => {
    execSync(`node ${cliPath} template tasks --name add-auth`, { encoding: 'utf-8', cwd: testDir });

    const tasksPath = join(testDir, 'bp', 'changes', 'add-auth', 'tasks.md');
    expect(existsSync(tasksPath)).toBe(true);
    const content = readFileSync(tasksPath, 'utf-8');
    expect(content).toContain('TDD');
    expect(content).toContain('type:behavior');
  });

  it('step 6: bp archive delta-spec 合并', () => {
    const bpDir = join(testDir, 'bp');
    const changeDir = join(bpDir, 'changes', 'add-auth');

    // 创建 delta-spec
    mkdirSync(join(changeDir, 'specs', 'auth'), { recursive: true });
    writeFileSync(
      join(changeDir, 'specs', 'auth', 'spec.md'),
      `# Auth Specification\n\n## Purpose\n\n认证管理。\n\n## Requirements\n\n### Requirement: Login\n\n系统 SHALL 提供登录功能。\n\n#### Scenario: Valid login\n- GIVEN a registered user\n- WHEN the user submits valid credentials\n- THEN a session token is returned\n`,
      'utf-8',
    );

    // 创建全局 spec（已有内容）
    mkdirSync(join(bpDir, 'specs', 'auth'), { recursive: true });
    writeFileSync(
      join(bpDir, 'specs', 'auth', 'spec.md'),
      `# Auth Specification\n\n## Purpose\n\n认证管理。\n\n## Requirements\n\n### Requirement: Logout\n\n系统 SHALL 提供登出功能。\n`,
      'utf-8',
    );

    // 执行 archive
    execSync(`node ${cliPath} archive bp/changes/add-auth`, { encoding: 'utf-8', cwd: testDir });

    // 验证归档
    const archiveEntries = execSync(`ls -1 ${join(bpDir, 'archive', 'changes')}`, { encoding: 'utf-8' }).trim().split('\n');
    expect(archiveEntries.some((e) => e.includes('add-auth'))).toBe(true);

    // 验证 delta-spec 合并
    const mergedSpec = readFileSync(join(bpDir, 'specs', 'auth', 'spec.md'), 'utf-8');
    expect(mergedSpec).toContain('Logout');
    expect(mergedSpec).toContain('Login');
    expect(mergedSpec).toContain('Valid login');
  });

  it('step 7: bp continue 输出下一步', () => {
    // 创建 requirements.md 使 continue 能通过校验
    writeFileSync(join(testDir, 'bp', 'requirements.md'), '# Requirements\n', 'utf-8');
    const output = execSync(`node ${cliPath} continue`, { encoding: 'utf-8', cwd: testDir });
    const result = JSON.parse(output);
    expect(result.current).toBeDefined();
    expect(result.current.step).toBeDefined();
  });

  it('step 8: bp list 输出归档', () => {
    const output = execSync(`node ${cliPath} list --all`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Archived');
    expect(output).toContain('add-auth');
  });
});
