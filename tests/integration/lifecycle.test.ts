import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
let testDir: string;

function write(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

describe('v2 lifecycle: init -> propose -> plan -> apply -> review -> archive', () => {
  beforeAll(() => {
    testDir = join(tmpdir(), `bp-v2-life-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('step 1: bp init creates project structure', () => {
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
    const bpDir = join(testDir, 'bp');

    expect(existsSync(join(bpDir, 'config.yaml'))).toBe(true);
    expect(existsSync(join(bpDir, 'roadmap.md'))).toBe(true);
    expect(existsSync(join(bpDir, 'specs'))).toBe(true);
    expect(existsSync(join(bpDir, 'conventions'))).toBe(true);
    expect(existsSync(join(bpDir, 'changes'))).toBe(true);

    // v2 does not create milestones, state.md, project.yml, archive, workspace
    expect(existsSync(join(bpDir, 'milestones'))).toBe(false);
    expect(existsSync(join(bpDir, 'state.md'))).toBe(false);
    expect(existsSync(join(bpDir, 'project.yml'))).toBe(false);

    const config = readFileSync(join(bpDir, 'config.yaml'), 'utf-8');
    expect(config).toContain('profile: standard');

    // Platform files are generated
    expect(existsSync(join(testDir, '.omp', 'commands', 'bp-init.md'))).toBe(true);
  });

  it('step 2: bp propose creates change with proposal.md', () => {
    execSync(`node ${cliPath} propose add-auth`, { encoding: 'utf-8', cwd: testDir });

    const proposalPath = join(testDir, 'bp', 'changes', 'add-auth', 'proposal.md');
    expect(existsSync(proposalPath)).toBe(true);
    const content = readFileSync(proposalPath, 'utf-8');
    expect(content).toContain('# Proposal:');
    expect(content).toContain('Intent');
  });

  it('step 3: bp continue shows progress for change', () => {
    const output = execSync(`node ${cliPath} continue add-auth`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('propose');
    expect(output).toContain('proposal.md');
  });

  it('step 4: bp list shows active changes', () => {
    const output = execSync(`node ${cliPath} list`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Active Changes:');
    expect(output).toContain('add-auth');
  });

  it('step 5: bp template outputs templates', () => {
    const proposal = execSync(`node ${cliPath} template proposal --stdout`, { encoding: 'utf-8', cwd: testDir });
    expect(proposal).toContain('# Proposal:');
    expect(proposal).toContain('Intent');

    const design = execSync(`node ${cliPath} template design --stdout`, { encoding: 'utf-8', cwd: testDir });
    expect(design).toContain('# Design:');
    expect(design).toContain('Design Items');

    const tasks = execSync(`node ${cliPath} template tasks --stdout`, { encoding: 'utf-8', cwd: testDir });
    expect(tasks).toContain('# Tasks:');
    expect(tasks).toContain('type:behavior');
  });

  it('step 6: bp archive archives a completed change', () => {
    // Set up a fully completed change with review
    const changeDir = join(testDir, 'bp', 'changes', 'complete-change');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(join(changeDir, 'proposal.md'), '# Proposal: complete-change\n\n## Intent\ntest\n', 'utf-8');
    writeFileSync(join(changeDir, 'design.md'), '# Design: complete-change\n\n## Design Items\n- DS-1: item\n', 'utf-8');
    writeFileSync(join(changeDir, 'tasks.md'), '# Tasks\n- [x] T-1\n', 'utf-8');
    writeFileSync(join(changeDir, 'review.md'), '## Overall Verdict: PASS\n', 'utf-8');
    mkdirSync(join(changeDir, 'specs', 'auth'), { recursive: true });
    writeFileSync(join(changeDir, 'specs', 'auth', 'spec.md'), '# Delta spec\n', 'utf-8');

    execSync('git init', { cwd: testDir });
    execSync('git config user.email test@test.com', { cwd: testDir });
    execSync('git config user.name test', { cwd: testDir });
    execSync('git add -A', { cwd: testDir });
    execSync('git commit -m "add completed change"', { cwd: testDir });

    const output = execSync(`node ${cliPath} archive complete-change`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Archived');
    expect(existsSync(join(testDir, 'bp/changes/complete-change'))).toBe(false);
  });

  it('step 7: bp roadmap shows roadmap', () => {
    const output = execSync(`node ${cliPath} roadmap`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Roadmap');
  });

  it('step 8: bp continue when no active changes shows hint', () => {
    // Archive the other active change so none remain
    execSync(`node ${cliPath} archive add-auth --force`, { encoding: 'utf-8', cwd: testDir });
    const output = execSync(`node ${cliPath} continue`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('roadmap');
  });
});
