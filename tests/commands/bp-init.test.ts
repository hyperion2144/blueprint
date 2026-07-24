/**
 * bp-init.test.ts — `bp init` command tests
 *
 * T-5 RED: GIVEN the init wizard is rendered
 *          WHEN platform options are inspected
 *          THEN Codex CLI is selectable with generation description
 *               AND generated gitignore contains `.codex/` and `.agents/`
 *               AND non-interactive defaults remain `[omp]`.
 *
 * Spec: specs/platform-gen/spec.md#codex-platform-selection
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { PLATFORM_OPTIONS } from '../../src/prompts/init-wizard.js';

const cliPath = join(process.cwd(), 'bin/cli.js');

describe('bp init — Codex platform support (T-5)', () => {
  let testDir: string;
  let bpDir: string;

  beforeAll(() => {
    testDir = join(tmpdir(), `bp-init-codex-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    bpDir = join(testDir, 'bp');
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, {
      encoding: 'utf-8',
      cwd: testDir,
    });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('init wizard exposes a Codex CLI option in the platform picker', () => {
    const codexOpt = PLATFORM_OPTIONS.find((o) => o.value === 'codex');
    expect(codexOpt).toBeDefined();
    expect(codexOpt!.label).toContain('Codex');
    // Description must identify the generated Skills + hooks surfaces
    expect(codexOpt!.hint).toContain('.agents/skills/');
    expect(codexOpt!.hint).toContain('.codex/hooks.json');
  });

  it('non-interactive `--yes` defaults remain OMP', () => {
    const config = readFileSync(join(bpDir, 'config.yaml'), 'utf-8');
    // Must not silently include codex when --yes is passed
    expect(config).toMatch(/^\s*-\s*omp\s*$/m);
    expect(config).not.toMatch(/^\s*-\s*codex\s*$/m);
  });

  it('generated .gitignore contains `.codex/` and `.agents/`', () => {
    const gitignorePath = join(testDir, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('.codex/');
    expect(content).toContain('.agents/');
  });

  it('appends missing gitignore entries without disturbing existing ones', () => {
    // Create a fresh temp dir with a pre-existing .gitignore that already
    // has `bp/` but not `.codex/` or `.agents/`.
    const dir = join(tmpdir(), `bp-init-codex-merge-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    try {
      writeFileSync(join(dir, '.gitignore'), 'bp/\n', 'utf-8');
      execSync(`node ${cliPath} init --dir ${dir} --yes`, {
        encoding: 'utf-8',
        cwd: dir,
      });
      const content = readFileSync(join(dir, '.gitignore'), 'utf-8');
      expect(content).toContain('bp/');
      expect(content).toContain('.codex/');
      expect(content).toContain('.agents/');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
