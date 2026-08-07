/**
 * Full refactor flow integration (T-12): fixture repo -> `bp refactor
 * analyze .` -> report artifact -> `bp dispatch refactorer` isolation ->
 * refactorer prompt guardrail.
 *
 * Exercises the built `bin/cli.js` end to end: the analyzer writes
 * bp/.refactor-report.md with all four metric types, the stdout summary
 * carries per-metric counts, dispatch reports executor-style isolation per
 * platform, and AGENT_PROMPTS['refactorer'] enforces behavior preservation.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';

import { AGENT_PROMPTS } from '../../src/templates/agents/index.js';

const cliPath = join(process.cwd(), 'bin/cli.js');
const testDir = join(tmpdir(), `refactor-flow-${Date.now()}`);

/** 24 distinct words per line, unique per-line token — deterministic 15-gram shingles. */
const GREEK_LINE = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega';
const dupBlock = (lines: number): string =>
  Array.from({ length: lines }, (_, i) => `// ${GREEK_LINE} line${String(i).padStart(4, '0')}`).join('\n');

function writeFile(root: string, relPath: string, content: string): void {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

/** One fragmented sibling pair, one duplicated block pair, one flat module, one low-reuse module. */
function buildFixture(root: string): void {
  writeFile(root, 'src/frag/a.ts', [
    '// Fragmented sibling A',
    "import { fA } from '../flat.js';",
    '',
    'export function aOne(): number {',
    '  return fA();',
    '}',
    '',
  ].join('\n'));
  writeFile(root, 'src/frag/b.ts', [
    '// Fragmented sibling B',
    "import { alpha } from '../wellshaped.js';",
    '',
    'export function bOne(): number {',
    '  return alpha();',
    '}',
    '',
  ].join('\n'));
  writeFile(root, 'src/frag/misc/README.md', '# frag misc\n');

  const oneTs = [
    '// Duplicated implementation block (file one)',
    "import { alpha } from '../wellshaped.js';",
    '',
    'export function one(): number {',
    '  return alpha();',
    '}',
    '',
    dupBlock(60),
    '',
  ].join('\n');
  writeFile(root, 'src/dup/one.ts', oneTs);
  writeFile(root, 'src/dup/two.ts', [
    '// Duplicated implementation block (file two)',
    "import { alpha } from '../wellshaped.js';",
    '',
    'export function two(): number {',
    '  return alpha();',
    '}',
    '',
    dupBlock(60),
    '',
    dupBlock(8),
    '',
  ].join('\n'));
  writeFile(root, 'src/dup/misc/README.md', '# dup misc\n');

  writeFile(root, 'src/flat/index.ts', [
    '// Flat module index',
    '',
    'export function fA(): number {',
    '  return 1;',
    '}',
    '',
    'export function fB(): number {',
    '  return 2;',
    '}',
    '',
    'export function fC(): number {',
    '  return 3;',
    '}',
    '',
  ].join('\n'));

  writeFile(root, 'src/lowreuse/utils.ts', [
    '// Low-reuse utility module',
    "import { fA } from '../flat.js';",
    '',
    'export function uA(): number {',
    '  return fA();',
    '}',
    '',
    'export function uB(): number {',
    '  return 2;',
    '}',
    '',
    'export function uC(): number {',
    '  return 3;',
    '}',
    '',
  ].join('\n'));
  writeFile(root, 'src/lowreuse/misc/README.md', '# lowreuse misc\n');

  writeFile(root, 'src/wellshaped/index.ts', [
    '// Well-shaped module with internal structure',
    '',
    'export function alpha(): number {',
    '  return 1;',
    '}',
    '',
    'export function beta(): number {',
    '  return 2;',
    '}',
    '',
    'export function gamma(): number {',
    '  return 3;',
    '}',
    '',
  ].join('\n'));
  writeFile(root, 'src/wellshaped/inner/README.md', '# wellshaped inner\n');
}

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
  buildFixture(testDir);
  // Platform isolation table: omp = Type: param, agent = Type: none (worktree).
  const cfgPath = join(testDir, 'bp', 'config.yaml');
  const cfg = readFileSync(cfgPath, 'utf-8');
  writeFileSync(cfgPath, cfg.replace(/platform:\n  - omp\n/, 'platform:\n  - omp\n  - agent\n'), 'utf-8');
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('bp refactor analyze on a fixture repo (T-12)', () => {
  it('writes bp/.refactor-report.md covering all four metric types', () => {
    const res = spawnSync(process.execPath, [cliPath, 'refactor', 'analyze', '.'], {
      cwd: testDir,
      encoding: 'utf-8',
    });
    expect(res.status).toBe(0);

    // stdout summary mentions each metric's count.
    expect(res.stdout).toMatch(/Refactor report for \.:/);
    expect(res.stdout).toContain('fragmented');
    expect(res.stdout).toContain('duplicated pairs');
    expect(res.stdout).toContain('flat');
    expect(res.stdout).toContain('low-reuse');

    // Report artifact exists with every metric type + per-module sections.
    const reportPath = join(testDir, 'bp', '.refactor-report.md');
    expect(existsSync(reportPath)).toBe(true);
    const report = readFileSync(reportPath, 'utf-8');
    expect(report).toContain('# Refactor Report');
    expect(report).toContain('## Summary');
    expect(report).toContain('## Module: src/frag');
    expect(report).toContain('### Fragmentation');
    expect(report).toContain('### Duplication');
    expect(report).toContain('### Flatness');
    expect(report).toContain('### Low Reuse');
  });

  it('produces a byte-identical report on a second run', () => {
    spawnSync(process.execPath, [cliPath, 'refactor', 'analyze', '.'], { cwd: testDir, encoding: 'utf-8' });
    const reportPath = join(testDir, 'bp', '.refactor-report.md');
    const first = readFileSync(reportPath, 'utf-8');
    const second = spawnSync(process.execPath, [cliPath, 'refactor', 'analyze', '.'], {
      cwd: testDir,
      encoding: 'utf-8',
    });
    expect(second.status).toBe(0);
    expect(readFileSync(reportPath, 'utf-8')).toBe(first);
  });
});

describe('bp dispatch refactorer isolation (T-12)', () => {
  it('reports Type: param for omp and Type: none with worktree instructions for agent', () => {
    const res = spawnSync(process.execPath, [cliPath, 'dispatch', 'refactorer', '--target', 'src/frag'], {
      cwd: testDir,
      encoding: 'utf-8',
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain('### Isolation');
    expect(res.stdout).toContain('- Type: param');
    expect(res.stdout).toContain('- Type: none');
    expect(res.stdout).toContain('git worktree add');
    expect(res.stdout).toContain('target: src/frag');
  });
});

describe('refactorer prompt behavior preservation (T-12)', () => {
  it('AGENT_PROMPTS["refactorer"] carries the guardrail contract', () => {
    const prompt = AGENT_PROMPTS['refactorer'];
    expect(prompt).toMatch(/behavior preserv/);
    expect(prompt).toContain('bp/specs/<domain>/spec.md');
    expect(prompt).toMatch(/STOP after ONE module/i);
  });
});
