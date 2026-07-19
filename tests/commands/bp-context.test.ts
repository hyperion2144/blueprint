import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
let testDir: string;

interface ExecError {
  stdout: string;
  status: number;
}

function isExecError(value: unknown): value is ExecError {
  if (value === null || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;
  return typeof obj.stdout === 'string' && typeof obj.status === 'number';
}

/** Run bp CLI and return { stdout, exitCode } without throwing. cwd is the beforeEach bp project. */
function cli(...args: string[]): { stdout: string; exitCode: number } {
  try {
    const stdout = execSync(`node "${cliPath}" ${args.join(' ')}`, {
      encoding: 'utf-8',
      cwd: testDir,
      timeout: 15000,
    });
    return { stdout, exitCode: 0 };
  } catch (e: unknown) {
    if (isExecError(e)) {
      return { stdout: e.stdout, exitCode: e.status };
    }
    return { stdout: '', exitCode: 1 };
  }
}

beforeEach(() => {
  testDir = join(tmpdir(), `bp-context-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  mkdirSync(testDir, { recursive: true });
  execSync(`node "${cliPath}" init --dir "${testDir}" --yes`, {
    encoding: 'utf-8',
    cwd: testDir,
    timeout: 15000,
  });
});

afterEach(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('bp context --format=full (T-8)', () => {
  it('matches the terminal snapshot byte-for-byte', () => {
    const { stdout, exitCode } = cli('context', 'research', '--format=full');
    expect(exitCode).toBe(0);
    expect(stdout).toMatchSnapshot();
  });
});

describe('bp context --format=compact (T-9)', () => {
  it('emits <bp-context> block', () => {
    const { stdout, exitCode } = cli('context', 'research', '--format=compact');
    expect(exitCode).toBe(0);
    expect(stdout).toContain('<bp-context>');
    expect(stdout).toContain('</bp-context>');
  });
});

describe('bp context --format=json (T-10)', () => {
  it('emits parseable JSON with all CompactContext fields', () => {
    const { stdout, exitCode } = cli('context', 'research', '--format=json');
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(Array.isArray(parsed.specs)).toBe(true);
    expect(parsed.specs.length).toBeGreaterThan(0);
    expect(parsed.specs[0].path).toBeDefined();
    expect(parsed.specs[0].title).toBeDefined();
    expect(parsed.specs[0].lineCount).toBeDefined();
    expect(Array.isArray(parsed.conventions)).toBe(true);
    expect(parsed.conventions.length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.rules)).toBe(true);
    expect(parsed.generatedAt).toBeDefined();
    expect(typeof parsed.generatedAt).toBe('string');
  });
});

describe('bp context --change unresolved (T-11)', () => {
  it('exits non-zero when --change does not exist', () => {
    try {
      execSync(
        `node "${cliPath}" context research --change does-not-exist`,
        { encoding: 'utf-8', cwd: testDir, timeout: 15000 },
      );
      expect.fail('Expected command to exit non-zero');
    } catch (e: unknown) {
      const execErr = e as { status?: number; stderr?: string };
      expect(execErr.status).not.toBe(0);
      const stderr = execErr.stderr ?? '';
      expect(stderr).toContain('does-not-exist');
      expect(stderr).toContain('not found');
    }
  });
});

describe('bp context on uninitialized project (T-12)', () => {
  it('exits non-zero when bp dir has no config.yaml', () => {
    const emptyDir = join(tmpdir(), `bp-context-uninit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    mkdirSync(emptyDir, { recursive: true });
    try {
      execSync(
        `node "${cliPath}" context research --dir "${emptyDir}"`,
        { encoding: 'utf-8', timeout: 15000 },
      );
      expect.fail('Expected command to exit non-zero');
    } catch (e: unknown) {
      const execErr = e as { status?: number; stderr?: string };
      expect(execErr.status).not.toBe(0);
      const stderr = execErr.stderr ?? '';
      expect(stderr).toContain('bp/config.yaml');
      expect(stderr).toContain('bp init');
    } finally {
      try { rmSync(emptyDir, { recursive: true, force: true }); } catch { /* ok */ }
    }
  });
});
