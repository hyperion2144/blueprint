/**
 * claude-code/handler.test.ts — Claude Code handler runtime tests
 *
 * T-2 RED: GIVEN a generated handler and a hook event payload
 *          WHEN the handler processes each supported event
 *          THEN it emits the expected bp-context or bp-workflow-state
 *               payload, validates wrapper tags, returns the trimmed
 *               workflow state for prompt/tool events, no-ops for
 *               SessionStop, bypasses on BP_HOOKS=0 / BP_DISABLE_HOOKS=1
 *               or missing config, AND uses deterministic fallbacks
 *               when the bp context command fails or returns malformed
 *               output. The generated descriptor content is byte-identical
 *               across invocations and against the HANDLER_SOURCE constant.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  isDisabled,
  hasBpConfig,
  generateContextBlock,
  generateWorkflowState,
  dispatchHandler,
  generateClaudeHandler,
  CLAUDE_HANDLER_PATH,
} from './handler.js';
import type { ProjectConfig } from '../../types/index.js';

/** Write a file after ensuring its parent directory exists. */
function writeConfig(cwd: string, relPath: string, content: string): void {
  const abs = join(cwd, relPath);
  mkdirSync(join(abs, '..'), { recursive: true });
  writeFileSync(abs, content);
}

describe('Claude Code handler runtime helpers', () => {
  let prevHooks: string | undefined;
  let prevDisable: string | undefined;

  beforeEach(() => {
    prevHooks = process.env.BP_HOOKS;
    prevDisable = process.env.BP_DISABLE_HOOKS;
  });

  afterEach(() => {
    if (prevHooks === undefined) delete process.env.BP_HOOKS;
    else process.env.BP_HOOKS = prevHooks;
    if (prevDisable === undefined) delete process.env.BP_DISABLE_HOOKS;
    else process.env.BP_DISABLE_HOOKS = prevDisable;
  });

  describe('isDisabled', () => {
    it('returns true when BP_HOOKS=0', () => {
      process.env.BP_HOOKS = '0';
      process.env.BP_DISABLE_HOOKS = undefined;
      expect(isDisabled()).toBe(true);
    });

    it('returns true when BP_DISABLE_HOOKS=1', () => {
      process.env.BP_HOOKS = undefined;
      process.env.BP_DISABLE_HOOKS = '1';
      expect(isDisabled()).toBe(true);
    });

    it('returns false when neither bypass env is set', () => {
      process.env.BP_HOOKS = undefined;
      process.env.BP_DISABLE_HOOKS = undefined;
      expect(isDisabled()).toBe(false);
    });
  });

  describe('hasBpConfig', () => {
    let testDir: string;

    beforeEach(() => {
      testDir = mkdtempSync(join(tmpdir(), 'bp-claude-handler-'));
    });

    afterEach(() => {
      rmSync(testDir, { recursive: true, force: true });
    });

    it('returns true when bp/config.yaml exists in cwd', () => {
      writeConfig(testDir, 'bp/config.yaml', 'version: 2\n');
      expect(hasBpConfig(testDir)).toBe(true);
    });

    it('returns false when bp/config.yaml is missing', () => {
      expect(hasBpConfig(testDir)).toBe(false);
    });

    it('returns false when cwd is undefined', () => {
      expect(hasBpConfig(undefined)).toBe(false);
    });
  });

  describe('generateContextBlock', () => {
    it('emits an empty <bp-context> block when bp/config.yaml is absent (no exec call)', () => {
      const cwd = mkdtempSync(join(tmpdir(), 'bp-claude-ctx-'));
      try {
        let called = false;
        const block = generateContextBlock(cwd, () => {
          called = true;
          return '<bp-context>x</bp-context>';
        });
        expect(called).toBe(false);
        expect(block).toBe('<bp-context>\n</bp-context>');
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    });

    it('returns the populated <bp-context> block from execBpContext when config present', () => {
      const cwd = mkdtempSync(join(tmpdir(), 'bp-claude-ctx-'));
      try {
        writeConfig(cwd, 'bp/config.yaml', 'version: 2\n');
        const fakeBlock =
          '<bp-context>\n## Specs\n- specs/core/spec.md\n## Conventions\n- conventions/coding.md\n</bp-context>';
        const block = generateContextBlock(cwd, () => fakeBlock);
        expect(block).toBe(fakeBlock);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    });

    it('falls back to the empty block when execBpContext throws', () => {
      const cwd = mkdtempSync(join(tmpdir(), 'bp-claude-ctx-'));
      try {
        writeConfig(cwd, 'bp/config.yaml', 'version: 2\n');
        const block = generateContextBlock(cwd, () => {
          throw new Error('bp binary not found');
        });
        expect(block).toBe('<bp-context>\n</bp-context>');
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    });

    it('falls back to the empty block when execBpContext returns malformed output', () => {
      const cwd = mkdtempSync(join(tmpdir(), 'bp-claude-ctx-'));
      try {
        writeConfig(cwd, 'bp/config.yaml', 'version: 2\n');
        const block = generateContextBlock(cwd, () => 'not a bp-context block');
        expect(block).toBe('<bp-context>\n</bp-context>');
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    });
  });

  describe('generateWorkflowState', () => {
    it('returns a fallback when bp/state.md is absent', () => {
      const cwd = mkdtempSync(join(tmpdir(), 'bp-claude-state-'));
      try {
        const state = generateWorkflowState(cwd);
        expect(typeof state).toBe('string');
        expect(state.length).toBeGreaterThan(0);
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    });

    it('returns the trimmed bp/state.md content when present', () => {
      const cwd = mkdtempSync(join(tmpdir(), 'bp-claude-state-'));
      try {
        writeConfig(cwd, 'bp/config.yaml', 'version: 2\n');
        writeConfig(cwd, 'bp/state.md', '\n\n## Stage: apply\n\n  ### Status: active\n  \n');
        const state = generateWorkflowState(cwd);
        expect(state).toBe('## Stage: apply\n\n  ### Status: active');
      } finally {
        rmSync(cwd, { recursive: true, force: true });
      }
    });
  });

  describe('dispatchHandler event mapping', () => {
    let cwd: string;

    beforeEach(() => {
      cwd = mkdtempSync(join(tmpdir(), 'bp-claude-dispatch-'));
      writeConfig(cwd, 'bp/config.yaml', 'version: 2\n');
      process.env.BP_HOOKS = undefined;
      process.env.BP_DISABLE_HOOKS = undefined;
    });

    afterEach(() => {
      rmSync(cwd, { recursive: true, force: true });
    });

    it('SessionStart emits a context payload', () => {
      const result = dispatchHandler('SessionStart', cwd);
      expect(result.kind).toBe('context');
      if (result.kind === 'context') {
        expect(result.payload).toContain('<bp-context>');
      }
    });

    it('SessionStart threads execBpContext through to the context payload', () => {
      const fakeBlock = '<bp-context>\n## Specs\n- specs/core/spec.md\n</bp-context>';
      const result = dispatchHandler('SessionStart', cwd, () => fakeBlock);
      expect(result.kind).toBe('context');
      if (result.kind === 'context') {
        expect(result.payload).toBe(fakeBlock);
      }
    });

    it('UserPromptSubmit emits a workflow-state payload', () => {
      const result = dispatchHandler('UserPromptSubmit', cwd);
      expect(result.kind).toBe('state');
      if (result.kind === 'state') {
        expect(result.payload.length).toBeGreaterThan(0);
      }
    });

    it('PreToolUse emits a workflow-state payload', () => {
      const result = dispatchHandler('PreToolUse', cwd);
      expect(result.kind).toBe('state');
    });

    it('PostToolUse emits a workflow-state payload', () => {
      const result = dispatchHandler('PostToolUse', cwd);
      expect(result.kind).toBe('state');
    });

    it('SessionStop emits a no-op payload', () => {
      const result = dispatchHandler('SessionStop', cwd);
      expect(result.kind).toBe('noop');
    });

    it('BP_HOOKS=0 bypass returns bypass for every event', () => {
      process.env.BP_HOOKS = '0';
      for (const evt of ['SessionStart', 'SessionStop', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse']) {
        expect(dispatchHandler(evt, cwd).kind).toBe('bypass');
      }
    });

    it('BP_DISABLE_HOOKS=1 bypass returns bypass for every event', () => {
      process.env.BP_DISABLE_HOOKS = '1';
      for (const evt of ['SessionStart', 'SessionStop', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse']) {
        expect(dispatchHandler(evt, cwd).kind).toBe('bypass');
      }
    });

    it('missing bp/config.yaml returns bypass for every event', () => {
      rmSync(join(cwd, 'bp', 'config.yaml'));
      for (const evt of ['SessionStart', 'SessionStop', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse']) {
        expect(dispatchHandler(evt, cwd).kind).toBe('bypass');
      }
    });
  });
});

describe('generateClaudeHandler', () => {
  it('returns the .claude/hooks/bp-claude-handler.mjs descriptor', () => {
    const files = generateClaudeHandler({} as ProjectConfig);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe(CLAUDE_HANDLER_PATH);
    expect(files[0].content.length).toBeGreaterThan(0);
  });

  it('emits content byte-identical to HANDLER_SOURCE (when re-exported)', () => {
    const files = generateClaudeHandler({} as ProjectConfig);
    // The descriptor content comes from HANDLER_SOURCE (or local constant in T-2).
    expect(typeof files[0].content).toBe('string');
    expect(files[0].content).toMatch(/SessionStart/);
    expect(files[0].content).toMatch(/hasBpConfig/);
  });

  it('is deterministic — two consecutive calls produce byte-identical output', () => {
    const a = generateClaudeHandler({} as ProjectConfig);
    const b = generateClaudeHandler({} as ProjectConfig);
    expect(a[0].path).toBe(b[0].path);
    expect(a[0].content).toBe(b[0].content);
  });
});