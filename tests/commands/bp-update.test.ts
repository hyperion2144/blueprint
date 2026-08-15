/**
 * bp-update.test.ts — `bp update` stale cleanup tests
 *
 * T-6 RED: GIVEN stale generated and unrelated Codex files
 *          WHEN `bp update` runs
 *          THEN only stale generated entries are removed
 *               AND unrelated files still exist.
 *
 * Spec: specs/platform-gen/spec.md#codex-update-cleanup
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');

describe('bp update — Codex safe stale cleanup (T-6)', () => {
  let testDir: string;
  let bpDir: string;

  beforeAll(() => {
    testDir = join(tmpdir(), `bp-update-codex-${Date.now()}`);
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

  beforeEach(() => {
    // Start each test from a clean state — remove any codex/agents fixtures
    rmSync(join(testDir, '.codex'), { recursive: true, force: true });
    rmSync(join(testDir, '.agents'), { recursive: true, force: true });
  });

  it('removes stale `.codex/hooks.json` from a previous run', () => {
    // Seed a stale bp-generated hooks.json — current generation no longer has it
    const codexDir = join(testDir, '.codex');
    mkdirSync(codexDir, { recursive: true });
    writeFileSync(
      join(codexDir, 'hooks.json'),
      '{"hooks": {"SessionStart": [{"hooks": [{"type": "command", "command": "node .codex/hooks/bp-handler.mjs SessionStart"}]}]}}',
      'utf-8'
    );

    // Drop codex from config so generateAll won't regenerate hooks.json
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    config = config.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - omp\n');
    writeFileSync(configPath, config, 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(testDir, '.codex', 'hooks.json'))).toBe(false);
  });

  it('removes stale `.agents/skills/bp-archive-old/` skill directory', () => {
    // Seed a stale bp-* skill directory that is NOT in the current generation
    const staleSkillDir = join(testDir, '.agents', 'skills', 'bp-archive-old');
    mkdirSync(staleSkillDir, { recursive: true });
    writeFileSync(join(staleSkillDir, 'SKILL.md'), '# stale', 'utf-8');

    // Drop codex from config so generateAll won't regenerate it
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    config = config.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - omp\n');
    writeFileSync(configPath, config, 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(staleSkillDir)).toBe(false);
  });

  it('keeps the generated `.agents/skills/bp-refactor/` skill across repeated updates', () => {
    // Switch the project to the agent platform so .agents/skills/ is generated
    const configPath = join(bpDir, 'config.yaml');
    const original = readFileSync(configPath, 'utf-8');
    try {
      const config = original.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - agent\n');
      writeFileSync(configPath, config, 'utf-8');

      execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });
      expect(existsSync(join(testDir, '.agents', 'skills', 'bp-refactor', 'SKILL.md'))).toBe(true);

      // A second update must NOT treat the generated refactor skill as stale
      execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });
      expect(existsSync(join(testDir, '.agents', 'skills', 'bp-refactor', 'SKILL.md'))).toBe(true);
    } finally {
      // Restore the original platform config so sibling tests are unaffected
      writeFileSync(configPath, original, 'utf-8');
    }
  });

  it('keeps the five design `.agents/skills/bp-*` dirs across `bp update` (R1 regression)', () => {
    // The design-track steps must survive the stale-cleanup whitelist —
    // `bp update` writes them, then cleanup must not delete them as stale.
    const configPath = join(bpDir, 'config.yaml');
    const original = readFileSync(configPath, 'utf-8');
    try {
      const config = original.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - agent\n');
      writeFileSync(configPath, config, 'utf-8');

      const out = execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

      const designSteps = ['design', 'design-html', 'design-review', 'design-shotgun', 'plan-design-review'];
      for (const step of designSteps) {
        expect(existsSync(join(testDir, '.agents', 'skills', `bp-${step}`, 'SKILL.md'))).toBe(true);
      }
      // Cleanup must not have logged the design skills as removed stale
      expect(out).not.toContain('Removed stale: .agents/skills/bp-design');
    } finally {
      // Restore the original platform config so sibling tests are unaffected
      writeFileSync(configPath, original, 'utf-8');
    }
  });

  it('one-shot migration: legacy `.agent/skills/bp-*` and `.agent/agents/bp-*.md` are removed and logged on first `bp update`', () => {
    // Seed legacy outputs as if the user upgraded from the pre-merge codex/agent
    // platform split. The migration runs once and removes everything bp- prefixed.
    const oldSkillsDir = join(testDir, '.agent', 'skills');
    const oldAgentsDir = join(testDir, '.agent', 'agents');
    mkdirSync(join(oldSkillsDir, 'bp-archive-old'), { recursive: true });
    writeFileSync(join(oldSkillsDir, 'bp-archive-old', 'SKILL.md'), '# legacy', 'utf-8');
    mkdirSync(join(oldSkillsDir, 'bp-refactor'), { recursive: true });
    writeFileSync(join(oldSkillsDir, 'bp-refactor', 'SKILL.md'), '# legacy', 'utf-8');
    mkdirSync(oldAgentsDir, { recursive: true });
    writeFileSync(join(oldAgentsDir, 'bp-planner.md'), '# legacy', 'utf-8');
    writeFileSync(join(oldAgentsDir, 'bp-reviewer.md'), '# legacy', 'utf-8');
    // Seed a user-owned file at .agent root that must be preserved
    writeFileSync(join(testDir, '.agent', 'user-notes.md'), 'user data', 'utf-8');

    // Configure the agent platform so generateAll also writes `.agents/`
    const configPath = join(bpDir, 'config.yaml');
    const original = readFileSync(configPath, 'utf-8');
    try {
      const config = original.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - agent\n');
      writeFileSync(configPath, config, 'utf-8');

      const out = execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

      // Migration logged the removed legacy entries
      expect(out).toContain('Removed stale (migrated to .agents/): .agent/skills/bp-archive-old/');
      expect(out).toContain('Removed stale (migrated to .agents/): .agent/skills/bp-refactor/');
      expect(out).toContain('Removed stale (migrated to .agents/): .agent/agents/bp-planner.md');
      expect(out).toContain('Removed stale (migrated to .agents/): .agent/agents/bp-reviewer.md');

      // Legacy directories are gone (the bp- entries were the only content)
      expect(existsSync(join(oldSkillsDir, 'bp-archive-old'))).toBe(false);
      expect(existsSync(join(oldSkillsDir, 'bp-refactor'))).toBe(false);
      expect(existsSync(join(oldAgentsDir, 'bp-planner.md'))).toBe(false);
      expect(existsSync(join(oldAgentsDir, 'bp-reviewer.md'))).toBe(false);

      // New outputs exist under .agents/
      expect(existsSync(join(testDir, '.agents', 'skills', 'bp-refactor', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(testDir, '.agents', 'agents', 'bp-planner.md'))).toBe(true);

      // User-owned file at the .agent root is preserved
      expect(existsSync(join(testDir, '.agent', 'user-notes.md'))).toBe(true);
    } finally {
      // Restore the original platform config so sibling tests are unaffected
      writeFileSync(configPath, original, 'utf-8');
    }
  });

  it('preserves arbitrary `.codex/foo.txt` (not generated by us)', () => {
    // User-written file under .codex that bp does not own
    const codexDir = join(testDir, '.codex');
    mkdirSync(codexDir, { recursive: true });
    writeFileSync(join(codexDir, 'foo.txt'), 'user data', 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(codexDir, 'foo.txt'))).toBe(true);
    expect(readFileSync(join(codexDir, 'foo.txt'), 'utf-8')).toBe('user data');
  });

  it('preserves non-bp skills in `.agents/skills/third-party/`', () => {
    // Skill not under the bp- namespace — must be left alone
    const thirdPartyDir = join(testDir, '.agents', 'skills', 'third-party');
    mkdirSync(thirdPartyDir, { recursive: true });
    writeFileSync(join(thirdPartyDir, 'SKILL.md'), '# third-party skill', 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(thirdPartyDir, 'SKILL.md'))).toBe(true);
  });

  it('preserves current-generation codex files when codex is configured', () => {
    // Restore codex in config so generateAll WILL regenerate it
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    if (!config.includes('- codex')) {
      config = config.replace(/platform:\n {2}- omp\n/, 'platform:\n  - omp\n  - codex\n');
      writeFileSync(configPath, config, 'utf-8');
    }
    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(testDir, '.codex', 'hooks.json'))).toBe(true);
    // At least one current bp skill should be present
    expect(existsSync(join(testDir, '.agents', 'skills', 'bp-plan', 'SKILL.md'))).toBe(true);
  });

  it('merges bp hooks into `.codex/hooks.json` and preserves user hooks with a backup', () => {
    // Ensure codex is configured
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    if (!config.includes('- codex')) {
      config = config.replace(/platform:\n {2}- omp\n/, 'platform:\n  - omp\n  - codex\n');
      writeFileSync(configPath, config, 'utf-8');
    }

    // Seed a user-owned hooks.json: a custom Stop hook plus an old bp group
    const codexDir = join(testDir, '.codex');
    mkdirSync(codexDir, { recursive: true });
    const original = JSON.stringify(
      {
        hooks: {
          Stop: [{ hooks: [{ type: 'command', command: 'notify-send done' }] }],
          SessionStart: [
            { hooks: [{ type: 'command', command: 'node .codex/hooks/bp-handler.mjs SessionStart' }] },
          ],
        },
      },
      null,
      2
    );
    writeFileSync(join(codexDir, 'hooks.json'), original, 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    const merged = JSON.parse(readFileSync(join(codexDir, 'hooks.json'), 'utf-8'));
    expect(merged.hooks.Stop[0].hooks[0].command).toBe('notify-send done');
    expect(merged.hooks.SessionStart[0].hooks[0].command).toBe('node .codex/hooks/bp-handler.mjs SessionStart');
    // Backup written before the merge
    expect(readFileSync(join(codexDir, 'hooks.json.bak'), 'utf-8')).toBe(original);
  });

  it('strips bp hooks from `.codex/hooks.json` and keeps user hooks when codex is dropped', () => {
    // Drop codex from config so hooks.json is stale
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    config = config.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - omp\n');
    writeFileSync(configPath, config, 'utf-8');

    const codexDir = join(testDir, '.codex');
    mkdirSync(codexDir, { recursive: true });
    const original = JSON.stringify(
      {
        hooks: {
          Stop: [{ hooks: [{ type: 'command', command: 'notify-send done' }] }],
          SessionStart: [
            { hooks: [{ type: 'command', command: 'node .codex/hooks/bp-handler.mjs SessionStart' }] },
          ],
        },
      },
      null,
      2
    );
    writeFileSync(join(codexDir, 'hooks.json'), original, 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    // File survives with user content; bp groups are gone
    const merged = JSON.parse(readFileSync(join(codexDir, 'hooks.json'), 'utf-8'));
    expect(merged.hooks.Stop[0].hooks[0].command).toBe('notify-send done');
    expect(merged.hooks.SessionStart).toBeUndefined();
    expect(merged.hooks.SessionStop).toBeUndefined();
    expect(readFileSync(join(codexDir, 'hooks.json.bak'), 'utf-8')).toBe(original);
  });
});

describe('bp update — Claude Code safe stale cleanup (T-4)', () => {
  let testDir: string;
  let bpDir: string;

  beforeAll(() => {
    testDir = join(tmpdir(), `bp-update-claude-${Date.now()}`);
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

  beforeEach(() => {
    rmSync(join(testDir, '.claude'), { recursive: true, force: true });
  });

  it('removes stale `.claude/settings.json` from a previous run', () => {
    const claudeDir = join(testDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(
      join(claudeDir, 'settings.json'),
      '{"hooks": {"SessionStart": [{"hooks": [{"type": "command", "command": "node .claude/hooks/bp-claude-handler.mjs SessionStart"}]}]}}',
      'utf-8'
    );

    // Drop claude-code from config so generateAll won't regenerate it
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    config = config.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - omp\n');
    writeFileSync(configPath, config, 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(testDir, '.claude', 'settings.json'))).toBe(false);
  });

  it('removes stale `.claude/hooks/bp-claude-handler.mjs` from a previous run', () => {
    const claudeHooksDir = join(testDir, '.claude', 'hooks');
    mkdirSync(claudeHooksDir, { recursive: true });
    writeFileSync(join(claudeHooksDir, 'bp-claude-handler.mjs'), '# stale', 'utf-8');

    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    config = config.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - omp\n');
    writeFileSync(configPath, config, 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(testDir, '.claude', 'hooks', 'bp-claude-handler.mjs'))).toBe(false);
  });

  it('preserves arbitrary `.claude/notes.txt` (not generated by us)', () => {
    const claudeDir = join(testDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    writeFileSync(join(claudeDir, 'notes.txt'), 'user notes', 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(testDir, '.claude', 'notes.txt'))).toBe(true);
    expect(readFileSync(join(testDir, '.claude', 'notes.txt'), 'utf-8')).toBe('user notes');
  });

  it('preserves current-generation claude files when claude-code is configured', () => {
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    if (!config.includes('- claude-code')) {
      config = config.replace(/platform:\n {2}- omp\n/, 'platform:\n  - omp\n  - claude-code\n');
      writeFileSync(configPath, config, 'utf-8');
    }
    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(join(testDir, '.claude', 'settings.json'))).toBe(true);
    expect(existsSync(join(testDir, '.claude', 'hooks', 'bp-claude-handler.mjs'))).toBe(true);
  });

  it('merges bp hooks into `.claude/settings.json` and preserves user settings with a backup', () => {
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    if (!config.includes('- claude-code')) {
      config = config.replace(/platform:\n {2}- omp\n/, 'platform:\n  - omp\n  - claude-code\n');
      writeFileSync(configPath, config, 'utf-8');
    }

    // Seed user-owned settings: permissions plus a custom Notification hook
    // and an old bp group on the renamed event (SessionStop).
    const claudeDir = join(testDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    const original = JSON.stringify(
      {
        permissions: { allow: ['Bash(npm run *)'] },
        hooks: {
          Notification: [{ hooks: [{ type: 'command', command: 'osascript -e "display notification"' }] }],
          SessionStop: [
            { hooks: [{ type: 'command', command: 'node .claude/hooks/bp-claude-handler.mjs SessionStop' }] },
          ],
        },
      },
      null,
      2
    );
    writeFileSync(join(claudeDir, 'settings.json'), original, 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    const merged = JSON.parse(readFileSync(join(claudeDir, 'settings.json'), 'utf-8'));
    expect(merged.permissions).toEqual({ allow: ['Bash(npm run *)'] });
    expect(merged.hooks.Notification[0].hooks[0].command).toContain('osascript');
    // Old bp event migrated to SessionEnd; SessionStop group removed
    expect(merged.hooks.SessionStop).toBeUndefined();
    expect(merged.hooks.SessionEnd[0].hooks[0].command).toBe(
      'node .claude/hooks/bp-claude-handler.mjs SessionEnd'
    );
    expect(readFileSync(join(claudeDir, 'settings.json.bak'), 'utf-8')).toBe(original);
  });

  it('strips bp hooks from `.claude/settings.json` and keeps user settings when claude-code is dropped', () => {
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    config = config.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - omp\n');
    writeFileSync(configPath, config, 'utf-8');

    const claudeDir = join(testDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    const original = JSON.stringify(
      {
        permissions: { allow: ['Bash(npm run *)'] },
        hooks: {
          Stop: [{ hooks: [{ type: 'command', command: 'echo turn ended' }] }],
          SessionStart: [
            { hooks: [{ type: 'command', command: 'node .claude/hooks/bp-claude-handler.mjs SessionStart' }] },
          ],
        },
      },
      null,
      2
    );
    writeFileSync(join(claudeDir, 'settings.json'), original, 'utf-8');

    execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    const merged = JSON.parse(readFileSync(join(claudeDir, 'settings.json'), 'utf-8'));
    expect(merged.permissions).toEqual({ allow: ['Bash(npm run *)'] });
    expect(merged.hooks.Stop[0].hooks[0].command).toBe('echo turn ended');
    expect(merged.hooks.SessionStart).toBeUndefined();
    expect(readFileSync(join(claudeDir, 'settings.json.bak'), 'utf-8')).toBe(original);
  });
});

describe('bp update — pi safe stale cleanup (T-8)', () => {
  let testDir: string;
  let bpDir: string;

  beforeAll(() => {
    testDir = join(tmpdir(), `bp-update-pi-${Date.now()}`);
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

  beforeEach(() => {
    // Start each test from a clean state
    rmSync(join(testDir, '.pi'), { recursive: true, force: true });
  });

  it('removes stale bp-owned .pi/ artifacts while preserving user-owned files', () => {
    // Seed stale bp artifacts
    const staleSkillDir = join(testDir, '.pi', 'skills', 'bp-plan');
    mkdirSync(staleSkillDir, { recursive: true });
    writeFileSync(join(staleSkillDir, 'SKILL.md'), '# stale', 'utf-8');
    const agentsDir = join(testDir, '.pi', 'agents');
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(join(agentsDir, 'bp-fixer.md'), '# stale', 'utf-8');
    const extDir = join(testDir, '.pi', 'extensions', 'bp');
    mkdirSync(extDir, { recursive: true });
    writeFileSync(join(extDir, 'index.ts'), '# stale', 'utf-8');
    // Seed user-owned files
    writeFileSync(join(testDir, '.pi', 'settings.json'), '{"user": true}', 'utf-8');
    const userSkillDir = join(testDir, '.pi', 'skills', 'user-skill');
    mkdirSync(userSkillDir, { recursive: true });
    writeFileSync(join(userSkillDir, 'SKILL.md'), '# user skill', 'utf-8');

    // Config without pi so generateAll won't regenerate .pi/ files
    const configPath = join(bpDir, 'config.yaml');
    let config = readFileSync(configPath, 'utf-8');
    config = config.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - omp\n');
    writeFileSync(configPath, config, 'utf-8');

    const out = execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

    expect(existsSync(staleSkillDir)).toBe(false);
    expect(existsSync(join(agentsDir, 'bp-fixer.md'))).toBe(false);
    expect(existsSync(extDir)).toBe(false);
    // The update logs a ✓ Removed stale: line for each removed artifact
    expect(out).toContain('✓ Removed stale: .pi/skills/bp-plan/');
    expect(out).toContain('✓ Removed stale: .pi/agents/bp-fixer.md');
    expect(out).toContain('✓ Removed stale: .pi/extensions/bp/');
    // User-owned files are preserved
    expect(existsSync(join(testDir, '.pi', 'settings.json'))).toBe(true);
    expect(readFileSync(join(testDir, '.pi', 'settings.json'), 'utf-8')).toBe('{"user": true}');
    expect(existsSync(join(userSkillDir, 'SKILL.md'))).toBe(true);
  });

  it('preserves all generated .pi/ files when pi is configured', () => {
    const configPath = join(bpDir, 'config.yaml');
    const original = readFileSync(configPath, 'utf-8');
    try {
      const config = original.replace(/platform:\n(?: {2}- [^\n]+\n)+/, 'platform:\n  - pi\n');
      writeFileSync(configPath, config, 'utf-8');

      execSync(`node ${cliPath} update --dir bp`, { encoding: 'utf-8', cwd: testDir });

      const piDir = join(testDir, '.pi');
      expect(existsSync(join(piDir, 'skills', 'bp-plan', 'SKILL.md'))).toBe(true);
      expect(existsSync(join(piDir, 'agents', 'bp-planner.md'))).toBe(true);
      expect(existsSync(join(piDir, 'extensions', 'bp', 'index.ts'))).toBe(true);

      // Count all generated files: 16 skills + 7 agents + 1 extension
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
          const full = join(dir, entry.name);
          if (entry.isDirectory()) walk(full);
          else files.push(full);
        }
      };
      walk(piDir);
      expect(files).toHaveLength(24);
    } finally {
      // Restore the original platform config so sibling tests are unaffected
      writeFileSync(configPath, original, 'utf-8');
    }
  });
});

describe('bp update — deleted cwd (ENOENT guard)', () => {
  it('exits 1 with a friendly message when the cwd was removed', () => {
    const dir = join(tmpdir(), `bp-update-deleted-cwd-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    try {
      // One shell command: cd into the dir, delete it, then exec node. The
      // spawned process inherits the now-deleted cwd and process.cwd() throws
      // ENOENT — the same failure the user hit in a removed terminal cwd.
      const out = execSync(`cd ${dir} && rm -rf ${dir} && node ${cliPath} update 2>&1; echo "exit:$?"`, {
        encoding: 'utf-8',
        shell: '/bin/sh',
        cwd: tmpdir(),
      });
      expect(out).toMatch(/current working directory no longer exists/i);
      expect(out).toMatch(/exit:1/);
      expect(out).not.toMatch(/uv_cwd/);
      expect(out).not.toMatch(/Error: ENOENT/);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
