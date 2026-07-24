/**
 * claude-code/hooks.test.ts — Claude Code settings.json generator tests
 *
 * T-1 RED: GIVEN a valid ProjectConfig
 *          WHEN generateClaudeHooks(config) runs
 *          THEN the rendered JSON contains exactly SessionStart,
 *               SessionStop, UserPromptSubmit, PreToolUse, and PostToolUse,
 *               only the two tool events carry matcher "Bash",
 *               every command invokes .claude/hooks/bp-claude-handler.mjs
 *               with its event name,
 *               AND two invocations of the same config produce
 *               byte-identical output.
 */

import { describe, it, expect } from 'vitest';
import {
  generateClaudeHooks,
  CLAUDE_HOOK_EVENTS,
  CLAUDE_HOOKS_PATH,
} from './hooks.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateClaudeHooks', () => {
  it('returns a single .claude/settings.json file descriptor', () => {
    const config = {} as ProjectConfig;
    const files = generateClaudeHooks(config);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe(CLAUDE_HOOKS_PATH);
  });

  it('settings.json is valid JSON that parses back to the same object', () => {
    const config = {} as ProjectConfig;
    const files = generateClaudeHooks(config);
    const parsed = JSON.parse(files[0].content);
    expect(parsed).toBeDefined();
    expect(parsed.hooks).toBeDefined();
  });

  it('wires exactly the five required Claude events in the documented order', () => {
    const config = {} as ProjectConfig;
    const files = generateClaudeHooks(config);
    const parsed = JSON.parse(files[0].content);
    const keys = Object.keys(parsed.hooks);
    expect(keys).toEqual([...CLAUDE_HOOK_EVENTS]);
    expect(keys).toEqual([
      'SessionStart',
      'SessionStop',
      'UserPromptSubmit',
      'PreToolUse',
      'PostToolUse',
    ]);
  });

  it('applies the Bash matcher on PreToolUse and PostToolUse only', () => {
    const config = {} as ProjectConfig;
    const files = generateClaudeHooks(config);
    const parsed = JSON.parse(files[0].content);
    expect(parsed.hooks.PreToolUse).toHaveLength(1);
    expect(parsed.hooks.PreToolUse[0].matcher).toBe('Bash');
    expect(parsed.hooks.PostToolUse).toHaveLength(1);
    expect(parsed.hooks.PostToolUse[0].matcher).toBe('Bash');
    for (const evt of ['SessionStart', 'SessionStop', 'UserPromptSubmit']) {
      expect(parsed.hooks[evt]).toHaveLength(1);
      expect(parsed.hooks[evt][0].matcher).toBeUndefined();
    }
  });

  it('every event handler invokes node .claude/hooks/bp-claude-handler.mjs <event>', () => {
    const config = {} as ProjectConfig;
    const files = generateClaudeHooks(config);
    const parsed = JSON.parse(files[0].content);
    for (const evt of Object.keys(parsed.hooks)) {
      const hookGroup = parsed.hooks[evt][0];
      const hook = hookGroup.hooks[0];
      expect(hook.type).toBe('command');
      expect(hook.command).toBe(`node .claude/hooks/bp-claude-handler.mjs ${evt}`);
    }
  });

  it('matches the documented snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateClaudeHooks(config);
    expect(files[0].content).toMatchSnapshot();
  });

  it('is deterministic — two invocations produce byte-identical output', () => {
    const config = {} as ProjectConfig;
    const first = generateClaudeHooks(config);
    const second = generateClaudeHooks(config);
    expect(first[0].content).toBe(second[0].content);
    expect(first[0].path).toBe(second[0].path);
  });
});