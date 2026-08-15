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
 *               config-skip no-ops, and the context injection gated to
 *               fresh user turns (never on tool-execution turns).
 */

import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import {
  createPiExtension,
  detectAgentTypeFromPrompt,
  discoverPiAgents,
  renderAugmentedBody,
  buildSubagentArgs,
  parseJsonLine,
  EXTENSION_SOURCE as RUNTIME_SOURCE,
  type PiAgentConfig,
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
  it('detects every role from its REAL generated prompt body (AGENT_PROMPTS lockstep)', async () => {
    // R1 regression: substring markers ('planner', 'executor', ...) do not
    // exist in the real bodies — only the role TITLE phrases do. Detection
    // must classify the shipped prompts exactly.
    const { AGENT_PROMPTS } = await import('../../templates/agents/index.js');
    expect(detectAgentTypeFromPrompt(AGENT_PROMPTS.planner)).toBe('planner');
    expect(detectAgentTypeFromPrompt(AGENT_PROMPTS.executor)).toBe('executor');
    expect(detectAgentTypeFromPrompt(AGENT_PROMPTS.reviewer)).toBe('reviewer');
    expect(detectAgentTypeFromPrompt(AGENT_PROMPTS['codebase-scanner'])).toBe('codebase-scanner');
    expect(detectAgentTypeFromPrompt(AGENT_PROMPTS.refactorer)).toBe('refactorer');
    expect(detectAgentTypeFromPrompt(AGENT_PROMPTS.fixer)).toBe('fixer');
    expect(detectAgentTypeFromPrompt(AGENT_PROMPTS.designer)).toBe('designer');
  });

  it('detects every shipped role prompt as its own type (disjointness across all AGENT_PROMPTS)', async () => {
    // A marker for role X that is a substring of role Y's prompt would
    // misclassify Y — iterate EVERY shipped prompt, not just the expected ones.
    const { AGENT_PROMPTS } = await import('../../templates/agents/index.js');
    for (const [role, prompt] of Object.entries(AGENT_PROMPTS)) {
      expect(detectAgentTypeFromPrompt(prompt)).toBe(role);
    }
  });

  it('detects each role from its title phrase and defaults otherwise', () => {
    expect(detectAgentTypeFromPrompt('You are a **Change Design Specialist**.')).toBe('planner');
    expect(detectAgentTypeFromPrompt('You are a **Code Implementation Specialist**.')).toBe('executor');
    expect(detectAgentTypeFromPrompt('You are a **Triple Review Specialist**.')).toBe('reviewer');
    expect(detectAgentTypeFromPrompt('You are a **Codebase Scanner** for bp.')).toBe('codebase-scanner');
    expect(detectAgentTypeFromPrompt('You are the **refactorer** sub-agent.')).toBe('refactorer');
    expect(detectAgentTypeFromPrompt('You are the **bp-fixer** sub-agent.')).toBe('fixer');
    expect(detectAgentTypeFromPrompt('You are a **Design Consultant**.')).toBe('designer');
    expect(detectAgentTypeFromPrompt('unrelated prompt')).toBe('default');
    expect(detectAgentTypeFromPrompt(undefined)).toBe('default');
  });
});

describe('handleSessionStart (T-4)', () => {
  it('emits one bp-context message augmented with ## Roadmap State for planner prompts', async () => {
    const { api, sent } = makeApi();
    const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => 'You are a **Change Design Specialist**.' };
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
      const title = role === 'executor' ? 'You are a **Code Implementation Specialist**.' : 'You are the **bp-fixer** sub-agent.';
      const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => title };
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
    const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => 'You are a **Triple Review Specialist**.' };
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
    const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => 'You are the **refactorer** sub-agent.' };
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

  it('emits the paths-only block for designer prompts (read-only design role)', async () => {
    const { api, sent } = makeApi();
    const ctx: PiExtensionContext = { cwd: testDir, getSystemPrompt: () => 'You are a **Design Consultant**.' };
    const ext = createPiExtension();
    await ext.handleSessionStart({}, ctx, api);
    expect(sent).toHaveLength(1);
    expect(sent[0].customType).toBe('bp-context');
    expect(sent[0].content).toContain('<bp-context>');
    expect(sent[0].content).not.toContain('## Roadmap State');
    expect(sent[0].content).not.toContain('## Invariants');
    expect(sent[0].content).not.toContain('GUARD-RAIL');
  });

  it('emits the identical clean paths-only block for codebase-scanner prompts as for default (Q2 lockstep)', async () => {
    // codebase-scanner must NOT fall through with a trailing \n\n — the template
    // augmentBody returns the compact block unchanged for it, so the runtime must
    // produce byte-identical output for the two agent types.
    const bodyFor = async (prompt: string): Promise<string> => {
      const { api, sent } = makeApi();
      const ext = createPiExtension();
      await ext.handleSessionStart({}, { cwd: testDir, getSystemPrompt: () => prompt }, api);
      return sent[0].content;
    };
    const scannerBody = await bodyFor('You are a **Codebase Scanner** for bp.');
    const designerBody = await bodyFor('You are a **Design Consultant**.');
    const defaultBody = await bodyFor('some unrelated prompt');
    expect(scannerBody).toBe(defaultBody);
    expect(designerBody).toBe(defaultBody);
    expect(scannerBody.endsWith('\n\n')).toBe(false);
    expect(designerBody.endsWith('\n\n')).toBe(false);
  });

  it('renderAugmentedBody returns the clean block when no branch augments (Q2)', () => {
    // Covers codebase-scanner (no branch) and refactorer without a report — both
    // must emit the bare compact block, not block + trailing newline.
    const bareDir = join(testDir, 'bare4');
    mkdirSync(bareDir, { recursive: true });
    for (const agentType of ['codebase-scanner', 'refactorer', 'designer'] as const) {
      const body = renderAugmentedBody(bareDir, agentType, undefined);
      expect(body).toBe('<bp-context>\n</bp-context>');
      expect(body.endsWith('\n\n')).toBe(false);
    }
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

describe('handleContext (T-4)', () => {
  it('injects bp-workflow-state on a fresh user turn', async () => {
    const ext = createPiExtension();
    const ctx: PiExtensionContext = { cwd: testDir };

    const msgs = [{ role: 'user', content: 'hello' }];
    const result = await ext.handleContext({ messages: msgs }, ctx, makeApi().api);
    expect(result?.messages).toHaveLength(2);
    expect(result!.messages[1].customType).toBe('bp-workflow-state');
    expect(result!.messages[1].display).toBe(false);
    expect(result!.messages[1].content).toContain('m1: First milestone [ACTIVE]');
  });

  it('does not inject on tool-execution turns (last message not user)', async () => {
    const ext = createPiExtension();
    const ctx: PiExtensionContext = { cwd: testDir };

    for (const last of [{ role: 'assistant', content: 'calling a tool' }, { role: 'toolResult', content: 'ok' }]) {
      const msgs = [{ role: 'user', content: 'hi' }, last];
      const result = await ext.handleContext({ messages: msgs }, ctx, makeApi().api);
      expect(result?.messages).toHaveLength(2);
      expect(result!.messages.some((m) => m.customType === 'bp-workflow-state')).toBe(false);
    }
  });

  it('does not inject twice when the state message is already present', async () => {
    const ext = createPiExtension();
    const ctx: PiExtensionContext = { cwd: testDir };

    // [user, state] from a previous turn, then a new user turn.
    const msgs = [
      { role: 'user', content: 'first' },
      { role: 'custom', customType: 'bp-workflow-state', content: 'stale', display: false, timestamp: 1 },
      { role: 'user', content: 'second' },
    ];
    const result = await ext.handleContext({ messages: msgs }, ctx, makeApi().api);
    expect(result?.messages).toHaveLength(3);
  });

  it('returns undefined under bypass and missing config', async () => {
    const prev = process.env.BP_HOOKS;
    process.env.BP_HOOKS = '0';
    try {
      const ext = createPiExtension();
      expect(await ext.handleContext({ messages: [{ role: 'user', content: 'hi' }] }, { cwd: testDir }, makeApi().api)).toBeUndefined();
    } finally {
      if (prev === undefined) delete process.env.BP_HOOKS;
      else process.env.BP_HOOKS = prev;
    }

    const bareDir = join(testDir, 'bare3');
    mkdirSync(bareDir, { recursive: true });
    const ext = createPiExtension();
    expect(await ext.handleContext({ messages: [{ role: 'user', content: 'hi' }] }, { cwd: bareDir }, makeApi().api)).toBeUndefined();
  });
});

describe('runtime ↔ template lockstep (T-4)', () => {
  it('re-exports EXTENSION_SOURCE byte-identical to the template', () => {
    expect(RUNTIME_SOURCE).toBe(EXTENSION_SOURCE);
  });

  it('ships the designer marker inside the generated extension source (template lockstep)', () => {
    // RUNTIME_SOURCE IS the template's EXTENSION_SOURCE (byte-identical
    // re-export) — the marker string must be present in the shipped template
    // so the generated extension detects the designer role the same way.
    expect(RUNTIME_SOURCE).toContain('Design Consultant');
    expect(RUNTIME_SOURCE).toContain('"designer"');
  });
});

describe('bp_subagent runtime helpers (T-5)', () => {
  const agentsDir = join(testDir, '.pi', 'agents');

  it('discovers valid .pi/agents/*.md files and skips invalid ones', () => {
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, 'bp-planner.md'),
      [
        '---',
        'name: bp-planner',
        'description: Change design',
        'tools: read, bash',
        '---',
        '',
        '# Planner system prompt',
        '',
        'Plan changes.',
      ].join('\n'),
      'utf-8',
    );
    writeFileSync(
      join(agentsDir, 'broken.md'),
      ['---', 'description: no name here', '---', '', 'body'].join('\n'),
      'utf-8',
    );

    const agents = discoverPiAgents(testDir);
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('bp-planner');
    expect(agents[0].description).toBe('Change design');
    expect(agents[0].tools).toEqual(['read', 'bash']);
    expect(agents[0].systemPrompt).toContain('# Planner system prompt');
  });

  it('skips non-.md files even with valid frontmatter (Q2 lockstep with template loadPiAgents)', () => {
    // The template's loadPiAgents filters entry.name.endsWith('.md') BEFORE the
    // name/description checks — a .txt with valid frontmatter must be invisible
    // to discovery in both counterparts.
    const sub = join(testDir, 'txt-skip-case');
    mkdirSync(join(sub, '.pi', 'agents'), { recursive: true });
    writeFileSync(
      join(sub, '.pi', 'agents', 'bp-planner.txt'),
      ['---', 'name: bp-planner', 'description: Change design', '---', '', '# Planner'].join('\n'),
      'utf-8',
    );
    expect(discoverPiAgents(sub)).toEqual([]);
  });

  it('parses tools from array form and tolerates missing dir', () => {
    writeFileSync(
      join(agentsDir, 'bp-executor.md'),
      [
        '---',
        'name: bp-executor',
        'description: Code implementation',
        'tools:',
        '  - read',
        '  - edit',
        'model: m/x',
        '---',
        '',
        '# Executor prompt',
      ].join('\n'),
      'utf-8',
    );
    const agents = discoverPiAgents(testDir);
    const executor = agents.find((a) => a.name === 'bp-executor');
    expect(executor).toBeDefined();
    expect(executor!.tools).toEqual(['read', 'edit']);
    expect(executor!.model).toBe('m/x');

    const bare = join(testDir, 'no-pi-dir');
    mkdirSync(bare, { recursive: true });
    expect(discoverPiAgents(bare)).toEqual([]);
  });

  it('builds the exact subagent argv for a given model/tools/prompt-file combo', () => {
    const agent: PiAgentConfig = {
      name: 'bp-planner',
      description: 'Change design',
      tools: ['read', 'bash'],
      systemPrompt: '# Planner',
      filePath: join(agentsDir, 'bp-planner.md'),
    };
    const args = buildSubagentArgs(agent, 'plan change', {
      model: 'm/x',
      thinkingLevel: 'high',
      systemPromptFile: '/tmp/p.md',
    });
    expect(args).toEqual([
      '--mode',
      'json',
      '-p',
      '--no-session',
      '--model',
      'm/x',
      '--thinking',
      'high',
      '--tools',
      'read,bash',
      '--append-system-prompt',
      '/tmp/p.md',
      'Task: plan change',
    ]);
  });

  it('omits optional flags when absent and inherits the agent model', () => {
    const agent: PiAgentConfig = {
      name: 'bp-fixer',
      description: 'Fix',
      model: 'agent-model',
      systemPrompt: '# Fixer',
      filePath: join(agentsDir, 'bp-fixer.md'),
    };
    const args = buildSubagentArgs(agent, 'fix it', {});
    expect(args).toEqual([
      '--mode',
      'json',
      '-p',
      '--no-session',
      '--model',
      'agent-model',
      'Task: fix it',
    ]);
  });

  it('parseJsonLine extracts message_end assistant messages and yields null on malformed lines', () => {
    const parsed = parseJsonLine('{"type":"message_end","message":{"role":"assistant","content":"done"}}');
    expect(parsed).not.toBeNull();
    const msg = (parsed as { message: { role: string; content: string } }).message;
    expect(msg.role).toBe('assistant');
    expect(msg.content).toBe('done');
    expect(parseJsonLine('not json')).toBeNull();
    expect(parseJsonLine('')).toBeNull();
  });
});
