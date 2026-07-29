import { describe, it, expect, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
const testDir = join(tmpdir(), `bp-e2e-${Date.now()}`);

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('E2E: init -> propose -> template -> continue -> archive', () => {
  it('step 1: bp init creates project structure', () => {
    mkdirSync(testDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });

    const bpDir = join(testDir, 'bp');
    expect(existsSync(join(bpDir, 'config.yaml'))).toBe(true);
    expect(existsSync(join(bpDir, 'roadmap.md'))).toBe(true);
    expect(existsSync(join(bpDir, 'specs'))).toBe(true);
    expect(existsSync(join(bpDir, 'conventions'))).toBe(true);
    expect(existsSync(join(bpDir, 'changes'))).toBe(true);
    // v2 specific checks: no milestones, no project.yml, no state.md
    expect(existsSync(join(bpDir, 'milestones'))).toBe(false);
    expect(existsSync(join(bpDir, 'project.yml'))).toBe(false);
    expect(existsSync(join(bpDir, 'state.md'))).toBe(false);
  });

  it('step 2: bp update generates platform files', () => {
    execSync(`node ${cliPath} update`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(testDir, '.omp', 'commands', 'bp-plan.md'))).toBe(true);
    expect(existsSync(join(testDir, '.omp', 'agents', 'bp-planner.md'))).toBe(true);
  });

  it('step 3: bp propose outputs workflow instructions', () => {
    const output = execSync(`node ${cliPath} propose add-auth`, { encoding: 'utf-8', cwd: testDir });
    // Should output orchestrator instructions, not create files directly
    expect(output).toContain('Orchestrator Steps');
    expect(output).toContain('Grill');

    // Create the proposal manually for subsequent test steps
    const changeDir = join(testDir, 'bp', 'changes', 'add-auth');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(join(changeDir, 'proposal.md'), '# Proposal: add-auth\n\n## Intent\n\nAdd auth functionality.\n## Scope\n\nOAuth login.');
  });

  it('step 4: bp continue outputs next step instructions', () => {
    const output = execSync(`node ${cliPath} continue add-auth`, { encoding: 'utf-8', cwd: testDir });
    // After proposal exists, continue should show plan as next step
    expect(output).toContain('plan');
    expect(output).toContain('Planner');
  });

  it('step 5: bp list shows active changes', () => {
    const output = execSync(`node ${cliPath} list`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Active Changes:');
    expect(output).toContain('add-auth');
  });

  it('step 6: bp template outputs templates', () => {
    const proposal = execSync(`node ${cliPath} template proposal --stdout`, { encoding: 'utf-8', cwd: testDir });
    expect(proposal).toContain('# Proposal:');
    expect(proposal).toContain('Intent');
  });
});
