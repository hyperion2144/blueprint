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
  // Create a change for list test
  execSync(`node ${cliPath} propose test-change`, { encoding: 'utf-8', cwd: testDir });
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

  it('bp propose creates change and proposal.md', () => {
    execSync(`node ${cliPath} propose another-change`, { encoding: 'utf-8', cwd: testDir });
    const proposalPath = join(testDir, 'bp', 'changes', 'another-change', 'proposal.md');
    expect(existsSync(proposalPath)).toBe(true);
    const content = readFileSync(proposalPath, 'utf-8');
    expect(content).toContain('# Proposal:');
  });

  it('bp list shows active changes', () => {
    const output = execSync(`node ${cliPath} list`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Active Changes:');
    expect(output).toContain('test-change');
    expect(output).toContain('another-change');
  });

  it('bp list --all shows spec domains', () => {
    const output = execSync(`node ${cliPath} list --all`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('Spec Domains:');
  });

  it('bp continue shows next step', () => {
    const output = execSync(`node ${cliPath} continue test-change`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('propose');
    expect(output).toContain('proposal.md');
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
