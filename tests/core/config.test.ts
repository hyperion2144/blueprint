import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, saveConfig, updateConfig, resolveModels, configPath } from '../../src/core/config.js';

const tmpDir = join(process.cwd(), 'tests/tmp-config');

const testConfigYml = `# Blueprint Project Configuration (v2)
version: 2
platform:
  - omp
profile: standard
context: |
  Test project
rules: {}
schema: spec-driven
models: {}
conventions:
  inject: true
git:
  create_tag: true
`;

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(configPath(tmpDir), testConfigYml, 'utf-8');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('reads and validates config.yaml', () => {
    const config = loadConfig(tmpDir);
    expect(config.version).toBe(2);
    expect(config.profile).toBe('standard');
    expect(config.platform).toEqual(['omp']);
    expect(config.schema).toBe('spec-driven');
    expect(config.conventions.inject).toBe(true);
    expect(config.git.create_tag).toBe(true);
  });

  it('preserves default values for absent fields', () => {
    const config = loadConfig(tmpDir);
    expect(config.rules).toEqual({});
    expect(config.models).toEqual({});
    expect(config.context).toBe('Test project\n');
  });
});

describe('saveConfig + updateConfig', () => {
  it('write-back preserves updates', () => {
    updateConfig(tmpDir, (config) => {
      config.profile = 'lite';
    });
    const content = readFileSync(configPath(tmpDir), 'utf-8');
    expect(content).toContain('profile: lite');
  });
});

describe('resolveModels', () => {
  it('standard profile default mapping', () => {
    const config = loadConfig(tmpDir);
    const models = resolveModels(config);
    expect(models.planner).toBe('pi/plan');
    expect(models.executor).toBe('pi/slow');
    expect(models.reviewer).toBe('pi/task');
    expect(models['codebase-scanner']).toBe('pi/task');
  });

  it('user models override profile defaults', () => {
    updateConfig(tmpDir, (config) => {
      config.models = { executor: 'pi/plan' };
    });
    const config2 = loadConfig(tmpDir);
    const models = resolveModels(config2);
    expect(models.executor).toBe('pi/plan');
    // Other roles keep profile default
    expect(models.planner).toBe('pi/plan');
  });

  it('lite profile mapping', () => {
    updateConfig(tmpDir, (config) => {
      config.profile = 'lite';
    });
    const config = loadConfig(tmpDir);
    const models = resolveModels(config);
    expect(models.planner).toBe('pi/task');
    expect(models.executor).toBe('pi/task');
    expect(models.reviewer).toBe('pi/task');
    expect(models['codebase-scanner']).toBe('pi/task');
  });
});
