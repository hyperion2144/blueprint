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
    // Description must identify the generated hooks surfaces (skills are
    // now owned by the `agent` platform under the shared `.agents/`)
    expect(codexOpt!.hint).toContain('.codex/hooks.json');
  });

  it('init wizard exposes the generic agent option pointing at `.agents/`', () => {
    const agentOpt = PLATFORM_OPTIONS.find((o) => o.value === 'agent');
    expect(agentOpt).toBeDefined();
    // After the merge to .agents/, the agent platform emits
    // .agents/skills/ + .agents/agents/ — NOT .agent/
    expect(agentOpt!.hint).toContain('.agents/skills/');
    expect(agentOpt!.hint).toContain('.agents/agents/');
    expect(agentOpt!.hint).not.toContain('.agent/skills/');
    expect(agentOpt!.hint).not.toContain('.agent/agents/');
  });

  it('non-interactive `--yes` defaults remain OMP', () => {
    const config = readFileSync(join(bpDir, 'config.yaml'), 'utf-8');
    // Must not silently include codex when --yes is passed
    expect(config).toMatch(/^\s*-\s*omp\s*$/m);
    expect(config).not.toMatch(/^\s*-\s*codex\s*$/m);
  });

  it('generated .gitignore contains `.codex/`, `.agents/`, and `.dsh/` (and NOT `.agent/`)', () => {
    const gitignorePath = join(testDir, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('.codex/');
    expect(content).toContain('.agents/');
    expect(content).toContain('.dsh/');
    // The legacy `.agent/` directory is no longer generated after the
    // merge into `.agents/` and must not appear in the gitignore.
    expect(content).not.toContain('.agent/');
  });
  it('init wizard exposes a DeepSeek Harness option in the platform picker', () => {
    const dshOpt = PLATFORM_OPTIONS.find((o) => o.value === 'dsh');
    expect(dshOpt).toBeDefined();
    expect(dshOpt!.label).toContain('DeepSeek');
    // Description must identify the generated .dsh/skills surface
    expect(dshOpt!.hint).toContain('.dsh/skills/');
  });
  it('init wizard exposes a Pi Coding Agent option in the platform picker', () => {
    const piOpt = PLATFORM_OPTIONS.find((o) => o.value === 'pi');
    expect(piOpt).toBeDefined();
    expect(piOpt!.label).toContain('Pi');
    // Description must identify the generated skills + agents + extension surfaces
    expect(piOpt!.hint).toContain('.pi/skills/');
    expect(piOpt!.hint).toContain('.pi/agents/');
    expect(piOpt!.hint).toContain('.pi/extensions/bp/');
  });


  it('init wizard exposes an OpenCode option in the platform picker', () => {
    const ocOpt = PLATFORM_OPTIONS.find((o) => o.value === 'opencode');
    expect(ocOpt).toBeDefined();
    expect(ocOpt!.hint).toContain('.opencode/commands/');
  });

  it('every registered platform is selectable in the wizard', () => {
    const values = PLATFORM_OPTIONS.map((o) => o.value).sort();
    expect(values).toEqual(['agent', 'claude-code', 'codex', 'dsh', 'omp', 'opencode', 'pi']);
  });


  it('generated .gitignore contains `.pi/` and `.opencode/`', () => {
    const gitignorePath = join(testDir, '.gitignore');
    expect(existsSync(gitignorePath)).toBe(true);
    const content = readFileSync(gitignorePath, 'utf-8');
    expect(content).toContain('.pi/');
    expect(content).toContain('.opencode/');
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
