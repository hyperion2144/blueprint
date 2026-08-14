import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
const testDir = join(tmpdir(), `bp-dispatch-test-${Date.now()}`);

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('bp dispatch role-based isolation', () => {
  it('planner output has Type: none', () => {
    const output = execSync(`node ${cliPath} dispatch planner`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('- Type: none');
    expect(output).not.toContain('- Type: param');
    expect(output).not.toContain('- Support: yes');
    expect(output).toContain('- Support: no');
  });

  it('executor output has Type: param', () => {
    const output = execSync(`node ${cliPath} dispatch executor`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('- Type: param');
    expect(output).toContain('- Support: yes');
  });

  it('reviewer output has Type: none', () => {
    const output = execSync(`node ${cliPath} dispatch reviewer`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('- Type: none');
    expect(output).not.toContain('- Type: param');
  });

  it('researcher output has Type: none', () => {
    const output = execSync(`node ${cliPath} dispatch researcher`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('- Type: none');
    expect(output).not.toContain('- Type: param');
  });
});

describe('bp dispatch Codex platform (T-7)', () => {
  const codexTestDir = join(tmpdir(), `bp-dispatch-codex-${Date.now()}`);
  const codexBpDir = join(codexTestDir, 'bp');

  beforeAll(() => {
    mkdirSync(codexTestDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${codexTestDir} --yes`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    // Replace platform: [omp] with platform: [codex] in config
    const cfg = readFileSync(join(codexBpDir, 'config.yaml'), 'utf-8');
    const updated = cfg.replace(/platform:\n {2}- omp\n/, 'platform:\n  - codex\n');
    writeFileSync(join(codexBpDir, 'config.yaml'), updated, 'utf-8');
  });

  afterAll(() => {
    rmSync(codexTestDir, { recursive: true, force: true });
  });

  it('Codex executor output declares isolation type none', () => {
    const output = execSync(`node ${cliPath} dispatch executor --change demo`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    expect(output).toContain('- Type: none');
    expect(output).not.toContain('- Type: param');
    expect(output).toContain('- Support: no');
  });

  it('Codex executor output instructs `git worktree add`', () => {
    const output = execSync(`node ${cliPath} dispatch executor --change demo`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    expect(output).toContain('git worktree add');
  });

  it('Codex executor output uses the `task` dispatch tool', () => {
    const output = execSync(`node ${cliPath} dispatch executor --change demo`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    expect(output).toMatch(/`task`/);
  });

  it('Codex executor output identifies bp-executor agent', () => {
    const output = execSync(`node ${cliPath} dispatch executor --change demo`, {
      encoding: 'utf-8',
      cwd: codexTestDir,
    });
    expect(output).toContain('bp-executor');
  });
});

describe('bp dispatch refactorer (T-3)', () => {
  const refactorerTestDir = join(tmpdir(), `bp-dispatch-refactorer-${Date.now()}`);
  const refactorerBpDir = join(refactorerTestDir, 'bp');

  beforeAll(() => {
    mkdirSync(refactorerTestDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${refactorerTestDir} --yes`, {
      encoding: 'utf-8',
      cwd: refactorerTestDir,
    });
    // Replace platform: [omp] with platform: [omp, agent]
    const cfg = readFileSync(join(refactorerBpDir, 'config.yaml'), 'utf-8');
    const updated = cfg.replace(/platform:\n {2}- omp\n/, 'platform:\n  - omp\n  - agent\n');
    writeFileSync(join(refactorerBpDir, 'config.yaml'), updated, 'utf-8');
  });

  afterAll(() => {
    rmSync(refactorerTestDir, { recursive: true, force: true });
  });

  it('refactorer output mirrors executor isolation per platform', () => {
    const output = execSync(`node ${cliPath} dispatch refactorer --target src/core`, {
      encoding: 'utf-8',
      cwd: refactorerTestDir,
    });
    expect(output).toContain('### Isolation');
    // omp: Type: param
    expect(output).toContain('- Type: param');
    expect(output).toContain('- Support: yes');
    // agent: Type: none with worktree instructions
    expect(output).toContain('- Type: none');
    expect(output).toContain('git worktree add');
    // Single-module target is passed through
    expect(output).toContain('target: src/core');
  });

  it('refactorer does not crash on missing template list', () => {
    const output = execSync(`node ${cliPath} dispatch refactorer --target src/core`, {
      encoding: 'utf-8',
      cwd: refactorerTestDir,
    });
    expect(output).not.toContain('Cannot read property');
  });

  it('refactorer dispatch without --target rejects with usage on stderr and exit 1', () => {
    const res = spawnSync(process.execPath, [cliPath, 'dispatch', 'refactorer'], {
      encoding: 'utf-8',
      cwd: refactorerTestDir,
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain('--target');
    expect(res.stdout).not.toContain('## Dispatch:');
  });
});

describe('bp dispatch fixer (T-11)', () => {
  const fixerTestDir = join(tmpdir(), `bp-dispatch-fixer-${Date.now()}`);
  const fixerBpDir = join(fixerTestDir, 'bp');

  beforeAll(() => {
    mkdirSync(fixerTestDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${fixerTestDir} --yes`, {
      encoding: 'utf-8',
      cwd: fixerTestDir,
    });
    // Replace platform: [omp] with platform: [omp, claude-code]
    const cfg = readFileSync(join(fixerBpDir, 'config.yaml'), 'utf-8');
    const updated = cfg.replace(/platform:\n {2}- omp\n/, 'platform:\n  - omp\n  - claude-code\n');
    writeFileSync(join(fixerBpDir, 'config.yaml'), updated, 'utf-8');
  });

  afterAll(() => {
    rmSync(fixerTestDir, { recursive: true, force: true });
  });

  it('fixer output mirrors executor isolation per platform', () => {
    const output = execSync(`node ${cliPath} dispatch fixer --change test-change`, {
      encoding: 'utf-8',
      cwd: fixerTestDir,
    });
    expect(output).toContain('## Dispatch: bp-fixer (omp)');
    expect(output).toContain('## Dispatch: bp-fixer (claude-code)');
    expect(output).toContain('### Isolation');
    // omp: Type: param
    expect(output).toContain('- Type: param');
    expect(output).toContain('- Support: yes');
    // claude-code: worktree param
    expect(output).toContain('worktree: <change>-<wave>');
    expect(output).toContain('- Support: yes');
  });

  it('fixer does not require --target and exits 0', () => {
    const res = spawnSync(process.execPath, [cliPath, 'dispatch', 'fixer', '--change', 'test-change'], {
      encoding: 'utf-8',
      cwd: fixerTestDir,
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('## Dispatch: bp-fixer');
  });

  it('fixer dispatch produces no artifact templates', () => {
    const output = execSync(`node ${cliPath} dispatch fixer --change test-change`, {
      encoding: 'utf-8',
      cwd: fixerTestDir,
    });
    expect(output).not.toContain('bp template');
  });
});

describe('bp dispatch designer (T-3)', () => {
  const designerTestDir = join(tmpdir(), `bp-dispatch-designer-${Date.now()}`);
  const designerBpDir = join(designerTestDir, 'bp');

  beforeAll(() => {
    mkdirSync(designerTestDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${designerTestDir} --yes`, {
      encoding: 'utf-8',
      cwd: designerTestDir,
    });
    // Extend the platform set so per-platform dispatch output is observable
    const cfg = readFileSync(join(designerBpDir, 'config.yaml'), 'utf-8');
    const updated = cfg.replace(/platform:\n {2}- omp\n/, 'platform:\n  - omp\n  - claude-code\n');
    writeFileSync(join(designerBpDir, 'config.yaml'), updated, 'utf-8');
  });

  afterAll(() => {
    rmSync(designerTestDir, { recursive: true, force: true });
  });

  it('prints a Dispatch section per configured platform with the bp-designer agent', () => {
    const output = execSync(`node ${cliPath} dispatch designer`, {
      encoding: 'utf-8',
      cwd: designerTestDir,
    });
    expect(output).toContain('## Dispatch: bp-designer (omp)');
    expect(output).toContain('## Dispatch: bp-designer (claude-code)');
  });

  it('emits a read-only Isolation block', () => {
    const output = execSync(`node ${cliPath} dispatch designer`, {
      encoding: 'utf-8',
      cwd: designerTestDir,
    });
    expect(output).toContain('### Isolation');
    expect(output).toContain('Read-only role — no isolation needed.');
    expect(output).not.toContain('- Type: param');
  });

  it('emits Model Selection with Role: designer and lists the design-system template', () => {
    const output = execSync(`node ${cliPath} dispatch designer`, {
      encoding: 'utf-8',
      cwd: designerTestDir,
    });
    expect(output).toContain('### Model Selection');
    expect(output).toContain('- Role: designer');
    expect(output).toContain('- Model: pi/plan');
    expect(output).toContain('bp template design-system');
  });

  it('config.models.designer overrides the printed model', () => {
    const cfgPath = join(designerBpDir, 'config.yaml');
    const cfg = readFileSync(cfgPath, 'utf-8');
    writeFileSync(cfgPath, cfg.replace('models: {}', 'models:\n  designer: pi/slow'), 'utf-8');
    try {
      const output = execSync(`node ${cliPath} dispatch designer`, {
        encoding: 'utf-8',
        cwd: designerTestDir,
      });
      expect(output).toContain('- Model: pi/slow');
    } finally {
      writeFileSync(cfgPath, cfg, 'utf-8');
    }
  });
});
