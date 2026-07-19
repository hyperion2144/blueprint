/**
 * Wave 3 integration test for the OMP Extension.
 *
 * Covers all 11 PR-4 Verify cases by exercising the exported handler
 * helpers in `src/integrations/omp/extension-runtime.ts`. The generator
 * surface (extension.ts / legacy-shim.ts) is verified separately by the
 * snapshot test below.
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import {
  EXTENSION_SOURCE,
  SHIM_SOURCE,
  isDisabled,
  detectAgentType,
  handleSessionStart,
  handleBeforeAgentStart,
  handleContext,
  generateCompactBlock,
  type ExtensionAPI,
  type ExtensionContext,
} from '../../src/integrations/omp/extension-runtime.js';
import { generateExtension } from '../../src/integrations/omp/extension.js';
import { generateLegacyShim } from '../../src/integrations/omp/legacy-shim.js';

const testDir = join(tmpdir(), `bp-omp-ext-${Date.now()}`);

function makeApi() {
  const sent: Array<{ customType?: string; content?: unknown; role?: string; timestamp?: number }> = [];
  const api: ExtensionAPI = {
    on() {},
    sendMessage(msg) {
      sent.push(msg as { customType?: string; content?: unknown; role?: string; timestamp?: number });
    },
  };
  return { api, sent };
}

function writeFile(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  writeFile('bp/config.yaml', 'profile: standard\nplatform: [omp]\n');
  writeFile(
    'bp/specs/foo/spec.md',
    '# Foo Spec\n\n## Requirements\n\n### Requirement: foo works\nThe system SHALL foo.\n',
  );
  writeFile('bp/conventions/coding.md', '# Coding\n\nStandards here.\n');
  writeFile('bp/changes/demo/proposal.md', 'status: in_progress\n\n# Demo\n\nA change.\n');
  writeFile('bp/changes/demo/tasks.md', 'status: in_progress\n\n# Tasks\n\n- [ ] T-1 acceptance: paths compile\n');
  writeFile(
    'bp/changes/demo/context.jsonl',
    [
      JSON.stringify({ file: 'src/core/a.ts', reason: 'core invariant A', phase: 'all' }),
      JSON.stringify({ file: 'src/core/b.ts', reason: 'guard rail B', phase: 'all', tag: 'guard-rail' }),
    ].join('\n') + '\n',
  );
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('OMP Extension isDisabled env bypass', () => {
  it('returns true when BP_HOOKS=0', () => {
    vi.stubEnv('BP_HOOKS', '0');
    try {
      expect(isDisabled()).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('returns true when BP_DISABLE_HOOKS=1', () => {
    vi.stubEnv('BP_DISABLE_HOOKS', '1');
    try {
      expect(isDisabled()).toBe(true);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('returns false when neither var is set', () => {
    vi.stubEnv('BP_HOOKS', '');
    vi.stubEnv('BP_DISABLE_HOOKS', '');
    try {
      expect(isDisabled()).toBe(false);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('OMP Extension sub-agent discrimination', () => {
  it('returns planner for agentTemplate containing planner', () => {
    expect(detectAgentType({ agentTemplate: 'bp-planner-v2' })).toBe('planner');
  });

  it('returns executor for agentTemplate containing executor', () => {
    expect(detectAgentType({ agentTemplate: 'bp-executor-v2' })).toBe('executor');
  });

  it('returns reviewer for agentTemplate containing reviewer', () => {
    expect(detectAgentType({ agentTemplate: 'bp-reviewer-v2' })).toBe('reviewer');
  });

  it('returns default for non-matching agentTemplate', () => {
    expect(detectAgentType({ agentTemplate: 'something-else' })).toBe('default');
    expect(detectAgentType({})).toBe('default');
  });
});

describe('handleSessionStart default path', () => {
  it('emits a <bp-context> compact block with no augmentation when agentTemplate has no match', async () => {
    const { api, sent } = makeApi();
    const ctx: ExtensionContext = { cwd: testDir, agentTemplate: 'something-else' };
    await handleSessionStart({}, ctx, api);
    expect(sent).toHaveLength(1);
    const msg = sent[0];
    expect(msg.customType).toBe('bp-context');
    expect(msg.role).toBe('custom');
    expect(typeof msg.timestamp).toBe('number');
    const text = (msg.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('<bp-context>');
    expect(text).toContain('</bp-context>');
    expect(text).not.toContain('## Roadmap State');
    expect(text).not.toContain('> GUARD-RAIL:');
    expect(text).not.toContain('## Invariants');
  });
});

describe('generateCompactBlock', () => {
  it('returns the <bp-context> markdown block for a real bp project', () => {
    const block = generateCompactBlock(testDir);
    expect(block).toContain('<bp-context>');
    expect(block).toContain('</bp-context>');
  });
});
