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

  it('all-platform golden-file snapshot', () => {
    const files = generateAll(config(['omp', 'claude-code', 'agent']));
    const snapshot: Record<string, string> = {};
    for (const f of files) {
      snapshot[f.path] = f.content;
    }
    expect(snapshot).toMatchSnapshot();
  });
});
