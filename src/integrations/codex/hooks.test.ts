/**
 * codex/hooks.test.ts — Codex hooks.json generator tests
 *
 * T-3 RED: GIVEN a valid ProjectConfig
 *          WHEN generateCodexHooks(config) runs
 *          THEN the returned JSON wires SessionStart, SessionStop,
 *               UserPromptSubmit, PreToolUse, and PostToolUse to the
 *               generated handler.
 */

import { describe, it, expect } from 'vitest';
import { generateCodexHooks, CODEX_HOOK_EVENTS } from './hooks.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateCodexHooks', () => {
  it('returns a single .codex/hooks.json file descriptor', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexHooks(config);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.codex/hooks.json');
  });

  it('hooks.json is valid JSON that parses back to the same object', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexHooks(config);
    const parsed = JSON.parse(files[0].content);
    expect(parsed).toBeDefined();
    expect(parsed.hooks).toBeDefined();
  });

  it('wires exactly the five required Codex events', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexHooks(config);
    const parsed = JSON.parse(files[0].content);
    const keys = Object.keys(parsed.hooks).sort();
    expect(keys).toEqual([...CODEX_HOOK_EVENTS].sort());
    expect(keys).toEqual([
      'PostToolUse',
      'PreToolUse',
      'SessionStart',
      'SessionStop',
      'UserPromptSubmit',
    ]);
  });

  it('applies the Bash matcher on PreToolUse and PostToolUse', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexHooks(config);
    const parsed = JSON.parse(files[0].content);
    expect(parsed.hooks.PreToolUse).toHaveLength(1);
    expect(parsed.hooks.PreToolUse[0].matcher).toBe('Bash');
    expect(parsed.hooks.PostToolUse).toHaveLength(1);
    expect(parsed.hooks.PostToolUse[0].matcher).toBe('Bash');
  });

  it('lifecycle events (SessionStart, SessionStop, UserPromptSubmit) carry no matcher', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexHooks(config);
    const parsed = JSON.parse(files[0].content);
    for (const evt of ['SessionStart', 'SessionStop', 'UserPromptSubmit']) {
      expect(parsed.hooks[evt]).toHaveLength(1);
      expect(parsed.hooks[evt][0].matcher).toBeUndefined();
    }
  });

  it('every event handler invokes node .codex/hooks/bp-handler.mjs <event>', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexHooks(config);
    const parsed = JSON.parse(files[0].content);
    for (const evt of Object.keys(parsed.hooks)) {
      const hookGroup = parsed.hooks[evt][0];
      const hook = hookGroup.hooks[0];
      expect(hook.type).toBe('command');
      expect(hook.command).toBe(`node .codex/hooks/bp-handler.mjs ${evt}`);
    }
  });

  it('matches the documented snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateCodexHooks(config);
    expect(files[0].content).toMatchSnapshot();
  });

  it('is deterministic — two invocations produce byte-identical output', () => {
    const config = {} as ProjectConfig;
    const first = generateCodexHooks(config);
    const second = generateCodexHooks(config);
    expect(first[0].content).toBe(second[0].content);
  });
});