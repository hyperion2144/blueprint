import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
const testDir = join(tmpdir(), `bp-int-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
  // Create a change for list test (manually — bp propose now outputs instructions only)
  const changeDir = join(testDir, 'bp', 'changes', 'test-change');
  mkdirSync(changeDir, { recursive: true });
  writeFileSync(join(changeDir, 'proposal.md'), '# Proposal: test-change\n\n## Intent\n\nTest.');
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('bp integration', () => {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, '..', '..', 'package.json'), 'utf-8'),
  );

  it('bp --version', () => {
    const output = execSync(`node ${cliPath} --version`, { encoding: 'utf-8' });
    expect(output.trim()).toBe(pkg.version);
  });

  it('bp init creates project structure', () => {
    const bpDir = join(testDir, 'bp');
    expect(existsSync(join(bpDir, 'config.yaml'))).toBe(true);
    expect(existsSync(join(bpDir, 'roadmap.md'))).toBe(true);
    expect(existsSync(join(bpDir, 'specs'))).toBe(true);
    expect(existsSync(join(bpDir, 'changes'))).toBe(true);
    expect(existsSync(join(bpDir, 'conventions'))).toBe(true);

    const config = readFileSync(join(bpDir, 'config.yaml'), 'utf-8');
    expect(config).toContain('profile: standard');
  });

  it('bp propose outputs workflow instructions', () => {
    const output = execSync(`node ${cliPath} propose another-change`, { encoding: 'utf-8', cwd: testDir });
    // Should output orchestrator instructions, not create files directly
    expect(output).toContain('Orchestrator Steps');
    expect(output).toContain('Grill');
  });

  it('bp list shows active changes', () => {
    // Create another-change manually for list test (propose no longer creates files)
    const changeDir = join(testDir, 'bp', 'changes', 'another-change');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(join(changeDir, 'proposal.md'), '# Proposal: another-change\n\n## Intent\n\nTest.');

    const output = execSync(`node ${cliPath} list`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Active Changes:');
    expect(output).toContain('test-change');
    expect(output).toContain('another-change');
  });

  it('bp list --all shows spec domains', () => {
    const output = execSync(`node ${cliPath} list --all`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Spec Domains:');
  });

  it('bp continue shows next step after proposal', () => {
    const output = execSync(`node ${cliPath} continue test-change`, { encoding: 'utf-8', cwd: testDir });
    // After proposal exists, continue should show plan as next step
    expect(output).toContain('plan');
  });

  it('bp template proposal outputs template', () => {
    const output = execSync(`node ${cliPath} template proposal --stdout`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('# Proposal:');
    expect(output).toContain('Intent');
  });

  it('bp config shows configuration', () => {
    const output = execSync(`node ${cliPath} config`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('version');
    expect(output).toContain('profile');
  });

  it('bp roadmap shows roadmap', () => {
    const output = execSync(`node ${cliPath} roadmap`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Roadmap');
  });
});
