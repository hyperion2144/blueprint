import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig, saveConfig, updateConfig, resolveModels, configPath, getRefactorThresholds } from '../../src/core/config.js';

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

  it('refactor thresholds default when the refactor section is absent', () => {
    const config = loadConfig(tmpDir);
    expect(config.refactor.thresholds.fragmentation.exportsMax).toBe(2);
    expect(config.refactor.thresholds.fragmentation.fileLinesMax).toBe(50);
    expect(config.refactor.thresholds.duplication.similarityMin).toBe(0.8);
    expect(config.refactor.thresholds.duplication.gramSize).toBe(15);
    expect(config.refactor.thresholds.flatness.maxDepth).toBe(1);
    expect(config.refactor.thresholds.flatness.subdirMin).toBe(2);
    expect(config.refactor.thresholds.lowReuse.fanInMax).toBe(1);
    expect(config.refactor.thresholds.lowReuse.exportsMin).toBe(3);
  });
});

describe('refactor thresholds round-trip', () => {
  it('custom thresholds round-trip through loadConfig + saveConfig', () => {
    const config = loadConfig(tmpDir);
    config.refactor.thresholds.fragmentation.exportsMax = 5;
    config.refactor.thresholds.duplication.similarityMin = 0.9;
    saveConfig(tmpDir, config);
    const reloaded = loadConfig(tmpDir);
    expect(reloaded.refactor.thresholds.fragmentation.exportsMax).toBe(5);
    expect(reloaded.refactor.thresholds.duplication.similarityMin).toBe(0.9);
    // Untouched defaults survive the round-trip
    expect(reloaded.refactor.thresholds.lowReuse.fanInMax).toBe(1);
    expect(reloaded.refactor.thresholds.lowReuse.exportsMin).toBe(3);
  });

  it('getRefactorThresholds returns the (defaulted) thresholds object', () => {
    const config = loadConfig(tmpDir);
    const thresholds = getRefactorThresholds(config);
    expect(thresholds.fragmentation.exportsMax).toBe(2);
    expect(thresholds.flatness.maxDepth).toBe(1);
    expect(thresholds.lowReuse.exportsMin).toBe(3);
  });
});

describe('saveConfig + updateConfig', () => {
  it('write-back preserves updates', () => {
    updateConfig(tmpDir, (config) => {
      config.profile = 'light';
    });
    const content = readFileSync(configPath(tmpDir), 'utf-8');
    expect(content).toContain('profile: light');
  });

  it('saveConfig preserves all schema fields on round-trip', () => {
    // Regression test for C3: saveConfig previously dropped workflow_version,
    // prompt_profile, approvers, and budget fields on round-trip.
    updateConfig(tmpDir, (config) => {
      config.workflow_version = '0.7.0';
      config.prompt_profile = 'full';
      config.approvers = ['alice', 'bob'];
      config.budget.no_progress_fuse_rounds = 5;
    });
    const reloaded = loadConfig(tmpDir);
    expect(reloaded.workflow_version).toBe('0.7.0');
    expect(reloaded.prompt_profile).toBe('full');
    expect(reloaded.approvers).toEqual(['alice', 'bob']);
    expect(reloaded.budget.no_progress_fuse_rounds).toBe(5);
  });

  it('saveConfig rejects invalid profile values', () => {
    // saveConfig now validates through Zod — 'lite' (v1 name) is rejected
    // because v2 uses 'light'. Migration happens on load, not on save.
    expect(() => {
      updateConfig(tmpDir, (config) => {
        // @ts-expect-error — intentionally invalid
        config.profile = 'lite';
      });
    }).toThrow();
  });

  it('loadConfig migrates legacy "lite" profile to "light"', () => {
    // Write a config with the legacy 'lite' value directly (bypassing saveConfig
    // validation) to verify loadConfig's backward-compat migration.
    const legacyConfig = testConfigYml.replace('profile: standard', 'profile: lite');
    writeFileSync(configPath(tmpDir), legacyConfig, 'utf-8');
    const config = loadConfig(tmpDir);
    expect(config.profile).toBe('light');
  });
});

describe('resolveModels', () => {
  it('standard profile default mapping', () => {
    const config = loadConfig(tmpDir);
    const models = resolveModels(config);
    expect(models.planner).toBe('pi/plan');
    expect(models.executor).toBe('pi/task');
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

  it('light profile mapping (formerly "lite")', () => {
    updateConfig(tmpDir, (config) => {
      config.profile = 'light';
    });
    const config = loadConfig(tmpDir);
    const models = resolveModels(config);
    expect(models.planner).toBe('pi/task');
    expect(models.executor).toBe('pi/task');
    expect(models.reviewer).toBe('pi/task');
    expect(models['codebase-scanner']).toBe('pi/task');
  });
});
