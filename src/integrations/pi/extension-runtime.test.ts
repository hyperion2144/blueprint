/**
 * extension-runtime.test.ts — pi extension runtime counterpart tests
 *
 * T-4 RED: GIVEN a temp bp project (config + roadmap + change with
 *          context.jsonl + tasks.md + refactor report) and an injected
 *          PiExtensionContext whose getSystemPrompt() returns a planner
 *          prompt
 *          WHEN handleSessionStart({}, ctx, api) runs via createPiExtension()
 *          THEN exactly one bp-context message is sent whose body contains
 *               <bp-context>, ## Roadmap State, and the fixture
 *               milestone/phase summary — plus the executor/fixer/reviewer/
 *               refactorer/default augmentation branches, the bypass and
 *               config-skip no-ops, the once-per-session before_agent_start
 *               gate, and the context re-injection behavior.
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import {
  createPiExtension,
  detectAgentTypeFromPrompt,
  EXTENSION_SOURCE as RUNTIME_SOURCE,
  type PiAPI,
  type PiExtensionContext,
  type PiMessage,
} from './extension-runtime.js';
import { EXTENSION_SOURCE } from '../../templates/pi/extension.tmpl.js';

const testDir = join(tmpdir(), `bp-pi-ext-${Date.now()}`);

const ROADMAP = [
  '# Roadmap',
  '',
  '## Milestone: m1 - First milestone [ACTIVE]',
  '',
  '### Phase: p1 - Init phase [IN_PROGRESS]',
  '',
  '- [ ] demo planned',
  '',
].join('\n');

const REPORT = [
  '# Refactor Report',
  '',
  '**Target**: .',
  '',
  '## Summary',
  '',
  '- Fragmented modules: 1 (2 files)',
  '- Duplication pairs: 1',
  '',
  '## Module: src/frag',
  '',
  '### Fragmentation',
  '',
  '- src/frag/a.ts — 1 exports, 5 non-blank lines',
  '',
].join('\n') + '\n';

function writeFile(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

function makeApi() {
  const sent: PiMessage[] = [];
  const api: PiAPI = {
    on() {},
    sendMessage(msg) {
      sent.push(msg);
    },
  };
  return { api, sent };
}

beforeAll(() => {
  mkdirSync(testDir, { recursive: true });
  writeFile('bp/config.yaml', 'profile: standard\nplatform: [pi]\n');
  writeFile('bp/roadmap.md', ROADMAP);
  writeFile(
    'bp/changes/demo/context.jsonl',
    [
      JSON.stringify({ file: 'src/core/a.ts', reason: 'core invariant A', phase: 'all' }),
      JSON.stringify({ file: 'src/core/b.ts', reason: 'guard rail B', phase: 'all', tag: 'guard-rail' }),
    ].join('\n') + '\n',
  );
  writeFile('bp/changes/demo/tasks.md', '# Tasks\n\n- [ ] T-1 do the thing\n');
  writeFile('bp/.refactor-report.md', REPORT);
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('detectAgentTypeFromPrompt', () => {
  it('detects each role marker and defaults otherwise', () => {
    expect(detectAgentTypeFromPrompt('You are the bp planner sub-agent')).toBe('planner');
    expect(detectAgentTypeFromPrompt('## Role\nexecutor prompt')).toBe('executor');
    expect(detectAgentTypeFromPrompt('## Role\nreviewer prompt')).toBe('reviewer');
    expect(detectAgentTypeFromPrompt('## Role\nrefactorer prompt')).toBe('refactorer');
    expect(detectAgentTypeFromPrompt('## Role\nfixer prompt')).toBe('fixer');
    expect(detectAgentTypeFromPrompt('unrelated prompt')).toBe('default');
    expect(detectAgentTypeFromPrompt(undefined)).toBe('default');
  });
});

describe('handleSessionStart (T-4)', () => {
  it('emits one bp-context message augmented with ## Roadmap State for planner prompts', async () => {
    const { api, sent } = makeApi();
    const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => 'You are the bp planner agent' };
    const ext = createPiExtension();
    await ext.handleSessionStart({}, ctx, api);
    expect(sent).toHaveLength(1);
    expect(sent[0].customType).toBe('bp-context');
    expect(sent[0].display).toBe(false);
    expect(sent[0].content).toContain('<bp-context>');
    expect(sent[0].content).toContain('## Roadmap State');
    expect(sent[0].content).toContain('m1: First milestone [ACTIVE]');
    expect(sent[0].content).toContain('Phase p1: Init phase [IN_PROGRESS]');
  });

  it('inlines context.jsonl rows with > GUARD-RAIL: prefixes for executor and fixer prompts', async () => {
    for (const role of ['executor', 'fixer']) {
      const { api, sent } = makeApi();
      const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => `## Role\n${role} prompt` };
      const ext = createPiExtension();
      await ext.handleSessionStart({}, ctx, api);
      expect(sent).toHaveLength(1);
      expect(sent[0].content).toContain('<bp-context>');
      expect(sent[0].content).toContain('file: src/core/a.ts [all] | reason: core invariant A');
      expect(sent[0].content).toContain('> GUARD-RAIL: file: src/core/b.ts [all] | reason: guard rail B');
    }
  });

  it('renders ## Invariants and ## tasks.md acceptance for reviewer prompts', async () => {
    const { api, sent } = makeApi();
    const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => '## Role\nreviewer prompt' };
    const ext = createPiExtension();
    await ext.handleSessionStart({}, ctx, api);
    expect(sent).toHaveLength(1);
    expect(sent[0].content).toContain('## Invariants');
    expect(sent[0].content).toContain('- core invariant A');
    expect(sent[0].content).toContain('- guard rail B');
    expect(sent[0].content).toContain('## tasks.md acceptance');
    expect(sent[0].content).toContain('- [ ] T-1 do the thing');
  });

  it('renders ## Refactor Targets from the report summary for refactorer prompts', async () => {
    const { api, sent } = makeApi();
    const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => '## Role\nrefactorer prompt' };
    const ext = createPiExtension();
    await ext.handleSessionStart({}, ctx, api);
    expect(sent).toHaveLength(1);
    expect(sent[0].content).toContain('## Refactor Targets');
    expect(sent[0].content).toContain('- Fragmented modules: 1 (2 files)');
    // Only the summary block is inlined, not the module sections.
    expect(sent[0].content).not.toContain('## Module:');
  });

  it('emits the paths-only block for default prompts', async () => {
    const { api, sent } = makeApi();
    const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => 'some unrelated prompt' };
    const ext = createPiExtension();
    await ext.handleSessionStart({}, ctx, api);
    expect(sent).toHaveLength(1);
    expect(sent[0].content).toContain('<bp-context>');
    expect(sent[0].content).not.toContain('## Roadmap State');
    expect(sent[0].content).not.toContain('GUARD-RAIL');
    expect(sent[0].content).not.toContain('## Invariants');
  });

  it('sends nothing under BP_HOOKS=0', async () => {
    const prev = process.env.BP_HOOKS;
    process.env.BP_HOOKS = '0';
    try {
      const { api, sent } = makeApi();
      const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => 'planner' };
      const ext = createPiExtension();
      await ext.handleSessionStart({}, ctx, api);
      expect(sent).toHaveLength(0);
    } finally {
      if (prev === undefined) delete process.env.BP_HOOKS;
      else process.env.BP_HOOKS = prev;
    }
  });

  it('sends nothing when bp/config.yaml is missing', async () => {
    const bareDir = join(testDir, 'bare');
    mkdirSync(bareDir, { recursive: true });
    const { api, sent } = makeApi();
    const ctx: PiExtensionContext = { cwd: bareDir, getSystemPrompt: () => 'planner' };
    const ext = createPiExtension();
    await ext.handleSessionStart({}, ctx, api);
    expect(sent).toHaveLength(0);
  });
});

describe('handleBeforeAgentStart (T-4)', () => {
  it('returns a bp-workflow-state message once then undefined', async () => {
    const ctx: PiExtensionContext = { cwd: testDir };
    const ext = createPiExtension();
    const first = await ext.handleBeforeAgentStart({}, ctx, makeApi().api);
    expect(first?.message?.customType).toBe('bp-workflow-state');
    expect(first?.message?.display).toBe(false);
    expect(first?.message?.content).toContain('m1: First milestone [ACTIVE]');
    const second = await ext.handleBeforeAgentStart({}, ctx, makeApi().api);
    expect(second).toBeUndefined();
  });

  it('returns undefined under BP_HOOKS=0', async () => {
    const prev = process.env.BP_DISABLE_HOOKS;
    process.env.BP_DISABLE_HOOKS = '1';
    try {
      const ext = createPiExtension();
      const result = await ext.handleBeforeAgentStart({}, { cwd: testDir }, makeApi().api);
      expect(result).toBeUndefined();
    } finally {
      if (prev === undefined) delete process.env.BP_DISABLE_HOOKS;
      else process.env.BP_DISABLE_HOOKS = prev;
    }
  });

  it('returns undefined when bp/config.yaml is missing', async () => {
    const bareDir = join(testDir, 'bare2');
    mkdirSync(bareDir, { recursive: true });
    const ext = createPiExtension();
    const result = await ext.handleBeforeAgentStart({}, { cwd: bareDir }, makeApi().api);
    expect(result).toBeUndefined();
  });
});

describe('handleContext (T-4)', () => {
  it('re-injects bp-workflow-state when absent and leaves messages unchanged when present', async () => {
    const ext = createPiExtension();
    const ctx: PiExtensionContext = { cwd: testDir };

    const absent = await ext.handleContext({ messages: [] }, ctx, makeApi().api);
    expect(absent?.messages).toHaveLength(1);
    expect(absent!.messages[0].customType).toBe('bp-workflow-state');
    expect(absent!.messages[0].display).toBe(false);
    expect(absent!.messages[0].content).toContain('m1: First milestone [ACTIVE]');

    const present = await ext.handleContext({ messages: absent!.messages }, ctx, makeApi().api);
    expect(present?.messages).toHaveLength(1);
    expect(present!.messages[0].customType).toBe('bp-workflow-state');
  });

  it('returns undefined under bypass and missing config', async () => {
    const prev = process.env.BP_HOOKS;
    process.env.BP_HOOKS = '0';
    try {
      const ext = createPiExtension();
      expect(await ext.handleContext({ messages: [] }, { cwd: testDir }, makeApi().api)).toBeUndefined();
    } finally {
      if (prev === undefined) delete process.env.BP_HOOKS;
      else process.env.BP_HOOKS = prev;
    }

    const bareDir = join(testDir, 'bare3');
    mkdirSync(bareDir, { recursive: true });
    const ext = createPiExtension();
    expect(await ext.handleContext({ messages: [] }, { cwd: bareDir }, makeApi().api)).toBeUndefined();
  });
});

describe('runtime ↔ template lockstep (T-4)', () => {
  it('re-exports EXTENSION_SOURCE byte-identical to the template', () => {
    expect(RUNTIME_SOURCE).toBe(EXTENSION_SOURCE);
  });
});
