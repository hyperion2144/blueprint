/**
 * opencode.test.ts - OpenCode provider registration and dispatch tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateAll } from './index.js';
import { registerOpenCodeProvider } from '../integrations/opencode/index.js';
import { setPlatformRegistry, createDefaultRegistry } from '../core/platform-registry.js';
import type { ProjectConfig } from '../types/index.js';

function config(platforms: string[]): ProjectConfig {
  return { platform: platforms } as unknown as ProjectConfig;
}

describe('opencode platform generation', () => {
  beforeEach(() => {
    setPlatformRegistry(createDefaultRegistry());
    registerOpenCodeProvider();
  });

  it('generateAll({platform:["opencode"]}) resolves without throwing', () => {
    expect(() => generateAll(config(['opencode']))).not.toThrow();
  });

  it('emits command files at .opencode/commands/', () => {
    const files = generateAll(config(['opencode']));
    const cmdFiles = files.filter((f) => f.path.startsWith('.opencode/commands/'));
    expect(cmdFiles).toHaveLength(11);
    for (const f of cmdFiles) {
      expect(f.path).toMatch(/^\.opencode\/commands\/bp-[a-z-]+\.md$/);
    }
  });

  it('emits agent files at .opencode/agents/', () => {
    const files = generateAll(config(['opencode']));
    const agentFiles = files.filter((f) => f.path.startsWith('.opencode/agents/'));
    expect(agentFiles).toHaveLength(5);
    for (const f of agentFiles) {
      expect(f.path).toMatch(/^\.opencode\/agents\/bp-[a-z-]+\.md$/);
    }
  });

  it('duplicate registration is a no-op (does not throw)', () => {
    expect(() => registerOpenCodeProvider()).not.toThrow();
    expect(() => registerOpenCodeProvider()).not.toThrow();
  });
});
