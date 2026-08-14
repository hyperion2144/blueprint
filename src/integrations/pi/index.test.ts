/**
 * pi/index.test.ts — pi platform provider registration and dispatch tests
 *
 * T-7 RED: GIVEN a fresh isolated PlatformRegistry
 *          WHEN registerPiProvider() runs followed by
 *               generateAll(config({ platform: ['pi'] }))
 *          THEN no unknown-platform error is thrown, the provider resolves
 *               with id/name/capabilities as specified, and exactly 18
 *               descriptors are emitted with paths under `.pi/`.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateAll } from '../../generators/index.js';
import { registerPiProvider } from './index.js';
import {
  PlatformRegistry,
  setPlatformRegistry,
  createDefaultRegistry,
} from '../../core/platform-registry.js';
import type { ProjectConfig } from '../../types/index.js';

function config(platforms: string[]): ProjectConfig {
  return { platform: platforms } as unknown as ProjectConfig;
}

describe('pi platform generation', () => {
  beforeEach(() => {
    // Reset registry to isolation-test the pi provider
    setPlatformRegistry(createDefaultRegistry());
    registerPiProvider();
  });

  it('registers pi with id, display name, and supportsCommands:false', () => {
    const provider = PlatformRegistry.resolve('pi');
    expect(provider.id).toBe('pi');
    expect(provider.name).toBe('Pi Coding Agent');
    expect(provider.capabilities?.supportsCommands).toBe(false);
    expect(PlatformRegistry.list().map((p) => p.id)).toContain('pi');
  });

  it('generateAll({platform:["pi"]}) resolves without throwing', () => {
    expect(() => generateAll(config(['pi']))).not.toThrow();
  });

  it('emits exactly 18 files under .pi/ (11 skills + 6 agents + 1 extension)', () => {
    const files = generateAll(config(['pi']));
    expect(files).toHaveLength(18);
    for (const f of files) {
      expect(f.path.startsWith('.pi/')).toBe(true);
    }
    expect(files.filter((f) => f.path.startsWith('.pi/skills/'))).toHaveLength(11);
    expect(files.filter((f) => f.path.startsWith('.pi/agents/'))).toHaveLength(6);
    expect(files.filter((f) => f.path === '.pi/extensions/bp/index.ts')).toHaveLength(1);
    // No command files — pi uses Agent Skills, not slash commands
    expect(files.some((f) => f.path.startsWith('.pi/commands/'))).toBe(false);
  });

  it('duplicate registration is a no-op (does not throw)', () => {
    expect(() => registerPiProvider()).not.toThrow();
    expect(() => registerPiProvider()).not.toThrow();
  });

  it('generating twice yields identical file sets', () => {
    const first = generateAll(config(['pi']));
    const second = generateAll(config(['pi']));
    expect(first).toEqual(second);
    expect(first.map((f) => f.path)).toEqual(second.map((f) => f.path));
  });
});
