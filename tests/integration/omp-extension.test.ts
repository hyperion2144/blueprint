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

describe('handleSessionStart planner path [T-27]', () => {
  it('appends ## Roadmap State from state.md', async () => {
    writeFile('bp/state.md', 'Milestone: M1\nPhase: Wave 3\nNext step: T-27\n');
    const { api, sent } = makeApi();
    const ctx: ExtensionContext = { cwd: testDir, agentTemplate: 'bp-planner-v2', activeChangeName: 'demo' };
    await handleSessionStart({}, ctx, api);
    expect(sent).toHaveLength(1);
    const text = (sent[0].content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('## Roadmap State');
    expect(text).toContain('Milestone: M1');
    expect(text).toContain('Next step: T-27');
  });
});

describe('handleSessionStart executor path [T-28]', () => {
  it('inlines every context.jsonl row and prefixes guard-rail tagged rows with > GUARD-RAIL:', async () => {
    const { api, sent } = makeApi();
    const ctx: ExtensionContext = { cwd: testDir, agentTemplate: 'bp-executor-v2', activeChangeName: 'demo' };
    await handleSessionStart({}, ctx, api);
    const text = (sent[0].content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('src/core/a.ts');
    expect(text).toContain('core invariant A');
    expect(text).toContain('src/core/b.ts');
    expect(text).toContain('> GUARD-RAIL: file: src/core/b.ts');
  });
});

describe('handleSessionStart reviewer path [T-29]', () => {
  it('lists each row reason under ## Invariants and appends tasks.md acceptance verbatim', async () => {
    const { api, sent } = makeApi();
    const ctx: ExtensionContext = { cwd: testDir, agentTemplate: 'bp-reviewer-v2', activeChangeName: 'demo' };
    await handleSessionStart({}, ctx, api);
    const text = (sent[0].content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('## Invariants');
    expect(text).toContain('- core invariant A');
    expect(text).toContain('- guard rail B');
    expect(text).toContain('T-1 acceptance: paths compile');
  });
});

describe('handleBeforeAgentStart [T-30]', () => {
  it('returns a bp-workflow-state custom message derived from state.md', async () => {
    writeFile('bp/state.md', 'Milestone: M1\nPhase: Wave 3\nNext: T-30\n');
    const result = await handleBeforeAgentStart({}, { cwd: testDir } as ExtensionContext, makeApi().api);
    expect(result).toBeDefined();
    expect(result!.message).toBeDefined();
    expect(result!.message!.customType).toBe('bp-workflow-state');
    expect(result!.message!.role).toBe('custom');
    expect(typeof result!.message!.timestamp).toBe('number');
    const text = (result!.message!.content[0] as { text: string }).text;
    expect(text).toContain('Milestone: M1');
    expect(text).toContain('Next: T-30');
  });
});

describe('handleContext post-compaction recovery [T-31,T-32]', () => {
  it('returns undefined when lastCompactionTs <= lastInjectionTs', async () => {
    const result = await handleContext(
      {},
      { cwd: testDir, lastCompactionTs: 100, lastInjectionTs: 200 } as ExtensionContext,
      makeApi().api,
    );
    expect(result).toBeUndefined();
  });

  it('returns undefined when both timestamps are undefined', async () => {
    const result = await handleContext(
      {},
      { cwd: testDir } as ExtensionContext,
      makeApi().api,
    );
    expect(result).toBeUndefined();
  });

  it('returns bp-workflow-state when lastCompactionTs > lastInjectionTs and no recent workflow-state message', async () => {
    writeFile('bp/state.md', 'Milestone: M1\nPhase: Wave 3\nNext: T-31\n');
    const result = await handleContext(
      {},
      {
        cwd: testDir,
        lastCompactionTs: 500,
        lastInjectionTs: 200,
        recentMessages: [{ customType: 'bp-context' }],
      } as ExtensionContext,
      makeApi().api,
    );
    expect(result).toBeDefined();
    expect(result!.message!.customType).toBe('bp-workflow-state');
    expect(result!.message!.content[0].text).toContain('Milestone: M1');
  });

  it('returns undefined when lastCompactionTs > lastInjectionTs but a recent bp-workflow-state exists', async () => {
    const result = await handleContext(
      {},
      {
        cwd: testDir,
        lastCompactionTs: 500,
        lastInjectionTs: 200,
        recentMessages: [{ customType: 'bp-workflow-state' }],
      } as ExtensionContext,
      makeApi().api,
    );
    expect(result).toBeUndefined();
  });
});

describe('BP_HOOKS=0 short-circuits every handler [T-33]', () => {
  it('handleSessionStart returns without side effects', async () => {
    vi.stubEnv('BP_HOOKS', '0');
    try {
      const { api, sent } = makeApi();
      await handleSessionStart({}, { cwd: testDir, agentTemplate: 'bp-planner-v2' } as ExtensionContext, api);
      expect(sent).toHaveLength(0);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('handleBeforeAgentStart returns undefined', async () => {
    vi.stubEnv('BP_DISABLE_HOOKS', '1');
    try {
      const result = await handleBeforeAgentStart({}, { cwd: testDir } as ExtensionContext, makeApi().api);
      expect(result).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('handleContext returns undefined', async () => {
    vi.stubEnv('BP_HOOKS', '0');
    try {
      const result = await handleContext(
        {},
        { cwd: testDir, lastCompactionTs: 999, lastInjectionTs: 1 } as ExtensionContext,
        makeApi().api,
      );
      expect(result).toBeUndefined();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

describe('handlers skip when bp/config.yaml is missing [T-34]', () => {
  it('handleSessionStart returns without side effects when config missing', async () => {
    const missingDir = join(tmpdir(), `bp-omp-missing-${Date.now()}-${Math.random()}`);
    mkdirSync(missingDir, { recursive: true });
    try {
      const { api, sent } = makeApi();
      await handleSessionStart({}, { cwd: missingDir } as ExtensionContext, api);
      expect(sent).toHaveLength(0);
    } finally {
      rmSync(missingDir, { recursive: true, force: true });
    }
  });

  it('handleBeforeAgentStart returns undefined when config missing', async () => {
    const missingDir = join(tmpdir(), `bp-omp-missing-${Date.now()}-${Math.random()}`);
    mkdirSync(missingDir, { recursive: true });
    try {
      const result = await handleBeforeAgentStart({}, { cwd: missingDir } as ExtensionContext, makeApi().api);
      expect(result).toBeUndefined();
    } finally {
      rmSync(missingDir, { recursive: true, force: true });
    }
  });

  it('handleContext returns undefined when config missing', async () => {
    const missingDir = join(tmpdir(), `bp-omp-missing-${Date.now()}-${Math.random()}`);
    mkdirSync(missingDir, { recursive: true });
    try {
      const result = await handleContext(
        {},
        { cwd: missingDir, lastCompactionTs: 999, lastInjectionTs: 1 } as ExtensionContext,
        makeApi().api,
      );
      expect(result).toBeUndefined();
    } finally {
      rmSync(missingDir, { recursive: true, force: true });
    }
  });
});

describe('generateExtension byte-determinism [T-35]', () => {
  it('two consecutive calls produce byte-identical output', () => {
    const a = generateExtension({ platform: ['omp'] } as never);
    const b = generateExtension({ platform: ['omp'] } as never);
    expect(a).toEqual(b);
    expect(a[0].path).toBe('.omp/extensions/bp/index.ts');
    expect(a[0].content).toBe(b[0].content);
    expect(a[0].content.length).toBeGreaterThan(0);
  });
});

describe('generateLegacyShim 5-line content [T-36]', () => {
  it('returns .omp/hooks/pre/bp.ts with re-export from extensions/bp/index.js', () => {
    const files = generateLegacyShim({ platform: ['omp'] } as never);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.omp/hooks/pre/bp.ts');
    expect(files[0].content).toContain('export { default } from "../extensions/bp/index.js"');
    expect(files[0].content).toContain('Legacy hook shim');
    // Non-empty lines must be <= 6 (DS-9)
    const nonEmpty = files[0].content.split('\n').filter((l) => l.trim().length > 0);
    expect(nonEmpty.length).toBeLessThanOrEqual(6);
  });
});

describe('generateCompactBlock', () => {
  it('returns the <bp-context> markdown block for a real bp project', () => {
    const block = generateCompactBlock(testDir);
    expect(block).toContain('<bp-context>');
    expect(block).toContain('</bp-context>');
  });
});
