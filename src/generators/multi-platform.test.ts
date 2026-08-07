/**
 * multi-platform.test.ts — Golden-file tests for all three platform providers
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

  it('agent platform generates expected files', () => {
    const files = generateAll(config(['agent']));
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(f.path).toMatch(/^\.agent\//);
    }
  });

  it('all three platforms generate concurrently', () => {
    const files = generateAll(config(['omp', 'claude-code', 'agent']));
    const ompFiles = files.filter((f) => f.path.startsWith('.omp/'));
    const claudeFiles = files.filter((f) => f.path.startsWith('.claude/'));
    const agentFiles = files.filter((f) => f.path.startsWith('.agent/'));
    expect(ompFiles.length).toBeGreaterThan(0);
    expect(claudeFiles.length).toBeGreaterThan(0);
    expect(agentFiles.length).toBeGreaterThan(0);
  });

  it('empty platform defaults to omp', () => {
    const files = generateAll(config([]));
    for (const f of files) {
      expect(f.path).toMatch(/^\.omp\//);
    }
  });

  it('refactor step generates across all five platforms', () => {
    const files = generateAll(config(['omp', 'claude-code', 'opencode', 'agent', 'codex']));
    const content: Record<string, string> = {};
    for (const f of files) content[f.path] = f.content;

    expect(content['.omp/commands/bp-refactor.md']).toBeDefined();
    expect(content['.claude/commands/bp-refactor.md']).toBeDefined();
    expect(content['.opencode/commands/bp-refactor.md']).toBeDefined();
    expect(content['.agent/skills/bp-refactor/SKILL.md']).toBeDefined();
    expect(content['.agents/skills/bp-refactor/SKILL.md']).toBeDefined();

    expect(content['.omp/commands/bp-refactor.md']).toContain('name: bp:refactor');
    expect(content['.omp/commands/bp-refactor.md']).toContain('argument-hint: "<target>"');
    expect(content['.claude/commands/bp-refactor.md']).toContain('name: bp:refactor');
    expect(content['.claude/commands/bp-refactor.md']).toContain('argument-hint: "<target>"');
    expect(content['.agents/skills/bp-refactor/SKILL.md']).toContain('name: bp:refactor');
  });

  it('refactorer agent generates across all four agent platforms', () => {
    const files = generateAll(config(['omp', 'claude-code', 'opencode', 'agent']));
    const content: Record<string, string> = {};
    for (const f of files) content[f.path] = f.content;

    for (const path of [
      '.omp/agents/bp-refactorer.md',
      '.claude/agents/bp-refactorer.md',
      '.opencode/agents/bp-refactorer.md',
      '.agent/agents/bp-refactorer.md',
    ]) {
      expect(content[path]).toBeDefined();
      expect(content[path]).toContain('Behavior-preserving consolidation + spec sync per assigned module');
      expect(content[path]).toContain('behavior preservation is mandatory');
    }
  });

  it('all-platform golden-file snapshot', () => {
    const files = generateAll(config(['omp', 'claude-code', 'agent']));
    const snapshot: Record<string, string> = {};
    for (const f of files) {
      snapshot[f.path] = f.content;
    }
    expect(snapshot).toMatchSnapshot();
  });
});
