/**
 * codex.test.ts — Codex provider registration and dispatch tests
 *
 * T-2 RED: GIVEN config platform is ['codex']
 *          WHEN the generator runs
 *          THEN the Codex provider is resolved and emits Skill descriptors
 *               without an unknown-platform error.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateAll } from './index.js';
import { registerCodexProvider } from '../integrations/codex/index.js';
import { setPlatformRegistry, createDefaultRegistry } from '../core/platform-registry.js';
import type { ProjectConfig } from '../types/index.js';

function config(platforms: string[]): ProjectConfig {
  return { platform: platforms } as unknown as ProjectConfig;
}

describe('codex platform generation', () => {
  beforeEach(() => {
    // Reset registry to isolation-test the codex provider
    setPlatformRegistry(createDefaultRegistry());
    registerCodexProvider();
  });

  it('generateAll({platform:["codex"]}) resolves without throwing', () => {
    expect(() => generateAll(config(['codex']))).not.toThrow();
  });

  it('emits the ten Codex Skill files at .agents/skills/...', () => {
    const files = generateAll(config(['codex']));
    const skillFiles = files.filter((f) => f.path.startsWith('.agents/skills/'));
    expect(skillFiles).toHaveLength(10);
    for (const f of skillFiles) {
      expect(f.path).toMatch(/^\.agents\/skills\/bp-[a-z-]+\/SKILL\.md$/);
    }
  });

  it('registers codex under a Codex-prefixed directory namespace', () => {
    const files = generateAll(config(['codex']));
    // Codex skills are emitted at .agents/skills/ (T-1 contract)
    const allCodex = files.filter((f) => f.path.startsWith('.agents/skills/'));
    expect(allCodex.length).toBeGreaterThan(0);
  });

  it('duplicate registration is a no-op (does not throw)', () => {
    expect(() => registerCodexProvider()).not.toThrow();
    expect(() => registerCodexProvider()).not.toThrow();
  });
});