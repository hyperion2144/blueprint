/**
 * platform-registry.test.ts
 *
 * Tests for PlatformProvider interface and PlatformRegistry.
 * All tests are independent — setPlatformRegistry(null) before each.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { PlatformRegistry, setPlatformRegistry, createDefaultRegistry, type PlatformProvider, type GeneratedFile } from './platform-registry.js';
import type { ProjectConfig } from '../types/index.js';

function dummyProvider(id: string, name?: string): PlatformProvider {
  return {
    id,
    name: name ?? id,
    generate(_config: ProjectConfig): GeneratedFile[] {
      return [{ path: `${id}/test.md`, content: `# ${id}` }];
    },
  };
}

beforeEach(() => {
  setPlatformRegistry(null);
});

describe('PlatformRegistry', () => {
  it('register and resolve a provider', () => {
    const p = dummyProvider('test');
    PlatformRegistry.register('test', p);
    expect(PlatformRegistry.resolve('test')).toBe(p);
  });

  it('throws on duplicate register', () => {
    PlatformRegistry.register('dup', dummyProvider('dup'));
    expect(() => PlatformRegistry.register('dup', dummyProvider('dup2'))).toThrow('already registered');
  });

  it('throws on resolve unknown', () => {
    expect(() => PlatformRegistry.resolve('nope')).toThrow('not found');
  });

  it('has returns true/false', () => {
    expect(PlatformRegistry.has('a')).toBe(false);
    PlatformRegistry.register('a', dummyProvider('a'));
    expect(PlatformRegistry.has('a')).toBe(true);
    expect(PlatformRegistry.has('b')).toBe(false);
  });

  it('list returns all registered providers', () => {
    PlatformRegistry.register('x', dummyProvider('x'));
    PlatformRegistry.register('y', dummyProvider('y'));
    const all = PlatformRegistry.list();
    expect(all).toHaveLength(2);
    expect(all.map((p) => p.id).sort()).toEqual(['x', 'y']);
  });

  it('generateAll iterates all providers', () => {
    PlatformRegistry.register('a', dummyProvider('a'));
    PlatformRegistry.register('b', dummyProvider('b'));
    const files = PlatformRegistry.generateAll({} as ProjectConfig);
    expect(files).toHaveLength(2);
    expect(files.map((f) => f.path).sort()).toEqual(['a/test.md', 'b/test.md']);
  });

  it('generateAll with empty registry returns empty', () => {
    const files = PlatformRegistry.generateAll({} as ProjectConfig);
    expect(files).toEqual([]);
  });

  it('provider capabilities default to undefined', () => {
    const p = dummyProvider('defaults');
    expect(p.capabilities).toBeUndefined();
  });
});

describe('createDefaultRegistry / setPlatformRegistry', () => {
  it('setPlatformRegistry(null) resets singleton', () => {
    PlatformRegistry.register('a', dummyProvider('a'));
    setPlatformRegistry(null);
    expect(() => PlatformRegistry.resolve('a')).toThrow('not found');
  });

  it('setPlatformRegistry with custom registry works', () => {
    const custom = createDefaultRegistry();
    const p = dummyProvider('custom');
    custom.set('custom', p);
    setPlatformRegistry(custom);
    expect(PlatformRegistry.resolve('custom')).toBe(p);
  });
});
