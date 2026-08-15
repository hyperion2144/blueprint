/**
 * multi-platform.test.ts — Golden-file tests for all platform providers
 */

import { describe, it, expect } from 'vitest';
import { generateAll } from './index.js';
import type { ProjectConfig } from '../types/index.js';

function config(platforms: string[]): ProjectConfig {
  return { platform: platforms } as unknown as ProjectConfig;
}

describe('multi-platform generation', () => {
  it('omp platform generates expected files', () => {
    const files = generateAll(config(['omp']));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f.path).toMatch(/^\.omp\//);
    }
  });

  it('claude-code platform generates expected files', () => {
    const files = generateAll(config(['claude-code']));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f.path).toMatch(/^\.claude\//);
    }
  });

  it('agent platform generates expected files at .agents/', () => {
    const files = generateAll(config(['agent']));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f.path).toMatch(/^\.agents\//);
    }
  });

  it('dsh platform generates expected files at .dsh/skills/ and .dsh/agents/', () => {
    const files = generateAll(config(['dsh']));
    expect(files.length).toBe(23); // 16 skills + 7 agent prompt files
    const skillFiles = files.filter((f) => f.path.startsWith('.dsh/skills/'));
    const agentFiles = files.filter((f) => f.path.startsWith('.dsh/agents/'));
    expect(skillFiles).toHaveLength(16);
    expect(agentFiles).toHaveLength(7);
    for (const f of skillFiles) {
      expect(f.path).toMatch(/^\.dsh\/skills\/bp-[a-z-]+\/SKILL\.md$/);
      expect(f.content).toMatch(/^---\nname: bp-[a-z-]+\n/);
      expect(f.content).not.toMatch(/name: bp:/);
    }
    for (const f of agentFiles) {
      expect(f.path).toMatch(/^\.dsh\/agents\/bp-[a-z-]+\.md$/);
      expect(f.content).toMatch(/^---\nname: bp-[a-z-]+\n/);
    }
  });

  it('all platforms generate concurrently', () => {
    const files = generateAll(config(['omp', 'claude-code', 'agent', 'dsh']));
    const ompFiles = files.filter((f) => f.path.startsWith('.omp/'));
    const claudeFiles = files.filter((f) => f.path.startsWith('.claude/'));
    const agentFiles = files.filter((f) => f.path.startsWith('.agents/'));
    const dshFiles = files.filter((f) => f.path.startsWith('.dsh/'));
    expect(ompFiles.length).toBeGreaterThan(0);
    expect(claudeFiles.length).toBeGreaterThan(0);
    expect(agentFiles.length).toBeGreaterThan(0);
    expect(dshFiles.length).toBe(23);
  });

  it('empty platform defaults to omp', () => {
    const files = generateAll(config([]));
    for (const f of files) {
      expect(f.path).toMatch(/^\.omp\//);
    }
  });

  it('refactor step generates across all six platforms', () => {
    const files = generateAll(config(['omp', 'claude-code', 'opencode', 'agent', 'codex', 'dsh']));
    const content: Record<string, string> = {};
    for (const f of files) content[f.path] = f.content;

    expect(content['.omp/commands/bp-refactor.md']).toBeDefined();
    expect(content['.claude/commands/bp-refactor.md']).toBeDefined();
    expect(content['.opencode/commands/bp-refactor.md']).toBeDefined();
    // agent + codex share `.agents/skills/bp-refactor/SKILL.md` (unified)
    expect(content['.agents/skills/bp-refactor/SKILL.md']).toBeDefined();
    // dsh renders the same body with kebab-case frontmatter
    expect(content['.dsh/skills/bp-refactor/SKILL.md']).toBeDefined();

    expect(content['.omp/commands/bp-refactor.md']).toContain('name: bp:refactor');
    expect(content['.omp/commands/bp-refactor.md']).toContain('argument-hint: "<target>"');
    expect(content['.claude/commands/bp-refactor.md']).toContain('name: bp:refactor');
    expect(content['.claude/commands/bp-refactor.md']).toContain('argument-hint: "<target>"');
    expect(content['.agents/skills/bp-refactor/SKILL.md']).toContain('name: bp:refactor');
    expect(content['.dsh/skills/bp-refactor/SKILL.md']).toContain('name: bp-refactor');
  });

  it('refactorer agent generates across all five agent platforms', () => {
    const files = generateAll(config(['omp', 'claude-code', 'opencode', 'agent', 'dsh']));
    const content: Record<string, string> = {};
    for (const f of files) content[f.path] = f.content;

    for (const path of [
      '.omp/agents/bp-refactorer.md',
      '.claude/agents/bp-refactorer.md',
      '.opencode/agents/bp-refactorer.md',
      '.agents/agents/bp-refactorer.md',
      '.dsh/agents/bp-refactorer.md',
    ]) {
      expect(content[path]).toBeDefined();
      expect(content[path]).toContain('Behavior-preserving consolidation + spec sync per assigned module');
      expect(content[path]).toContain('behavior preservation is mandatory');
    }
  });

  it('fixer agent generates across all five agent platforms embedding the fixer prompt', () => {
    const files = generateAll(config(['omp', 'claude-code', 'opencode', 'agent', 'dsh']));
    const content: Record<string, string> = {};
    for (const f of files) content[f.path] = f.content;

    for (const path of [
      '.omp/agents/bp-fixer.md',
      '.claude/agents/bp-fixer.md',
      '.opencode/agents/bp-fixer.md',
      '.agents/agents/bp-fixer.md',
      '.dsh/agents/bp-fixer.md',
    ]) {
      expect(content[path]).toBeDefined();
      expect(content[path]).toContain('Fix proposal/design/implementation per reviewer report');
      expect(content[path]).toContain('the reviewer\'s report is your only source of truth');
    }
  });

  it('all-platform golden-file snapshot', () => {
    const files = generateAll(config(['omp', 'claude-code', 'agent', 'dsh']));
    const snapshot: Record<string, string> = {};
    for (const f of files) {
      snapshot[f.path] = f.content;
    }
    expect(snapshot).toMatchSnapshot();
  });
});