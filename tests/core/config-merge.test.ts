/**
 * config-merge.test.ts — unit tests for item-by-item hook config merging
 *
 * Contract: `.claude/settings.json` / `.codex/hooks.json` may carry
 * user-owned content (permissions, env, the user's own hooks). Merging
 * must keep that content, replace only bp-owned hook groups, drop bp
 * groups the generator no longer emits, and back up nothing itself (the
 * writer owns backups).
 */

import { describe, it, expect } from 'vitest';
import {
  isCommandHookGroup,
  containsBpHookGroups,
  mergeHookConfig,
  isEmptyJsonObject,
} from '../../src/core/config-merge.js';

const bpGroup = (command: string) => ({
  hooks: [{ type: 'command', command }],
});

const MARKER = 'bp-claude-handler.mjs';
const isBp = isCommandHookGroup(MARKER);

describe('isCommandHookGroup', () => {
  it('matches groups whose command references the marker', () => {
    expect(isBp(bpGroup(`node .claude/hooks/${MARKER} SessionStart`))).toBe(true);
  });

  it('rejects groups without a marker command', () => {
    expect(isBp(bpGroup('osascript -e "display notification"'))).toBe(false);
    expect(isBp({ hooks: [{ type: 'prompt' }] })).toBe(false);
    expect(isBp({ matcher: 'Bash' })).toBe(false);
    expect(isBp({})).toBe(false);
  });
});

describe('containsBpHookGroups', () => {
  it('is true only when a bp-marked group exists', () => {
    expect(
      containsBpHookGroups({ hooks: { SessionStart: [bpGroup(`node .claude/hooks/${MARKER} SessionStart`)] } }, isBp)
    ).toBe(true);
    expect(containsBpHookGroups({ hooks: { SessionStart: [bpGroup('echo hi')] } }, isBp)).toBe(false);
    expect(containsBpHookGroups({ permissions: { allow: ['Bash'] } }, isBp)).toBe(false);
    expect(containsBpHookGroups('not an object', isBp)).toBe(false);
  });
});

describe('mergeHookConfig', () => {
  const generated = {
    hooks: {
      SessionStart: [bpGroup(`node .claude/hooks/${MARKER} SessionStart`)],
      SessionEnd: [bpGroup(`node .claude/hooks/${MARKER} SessionEnd`)],
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: `node .claude/hooks/${MARKER} PreToolUse` }] }],
    },
  };

  it('keeps user top-level keys and user groups on other events', () => {
    const existing = {
      permissions: { allow: ['Bash'] },
      env: { FOO: 'bar' },
      hooks: {
        Notification: [bpGroup('osascript -e "display notification"')],
      },
    };
    const merged = mergeHookConfig(existing, generated, isBp);
    expect(merged.permissions).toEqual({ allow: ['Bash'] });
    expect(merged.env).toEqual({ FOO: 'bar' });
    expect(merged.hooks.Notification).toHaveLength(1);
  });

  it('replaces bp groups on the same event while keeping user groups', () => {
    const existing = {
      hooks: {
        PreToolUse: [
          bpGroup('echo user pre-tool'),
          bpGroup(`node .claude/hooks/${MARKER} PreToolUse`),
        ],
      },
    };
    const merged = mergeHookConfig(existing, generated, isBp);
    const groups = merged.hooks.PreToolUse;
    expect(groups).toHaveLength(2);
    expect(groups[0].hooks[0].command).toBe('echo user pre-tool');
    expect(groups[1].hooks[0].command).toContain(MARKER);
  });

  it('adds generated events and drops bp groups from events no longer generated', () => {
    const existing = {
      hooks: {
        SessionStop: [bpGroup(`node .claude/hooks/${MARKER} SessionStop`)],
      },
    };
    const merged = mergeHookConfig(existing, generated, isBp);
    expect(merged.hooks.SessionStop).toBeUndefined();
    expect(merged.hooks.SessionStart).toHaveLength(1);
    expect(merged.hooks.SessionEnd).toHaveLength(1);
  });

  it('strips everything when generated is empty and only bp content existed', () => {
    const existing = {
      hooks: { SessionStart: [bpGroup(`node .claude/hooks/${MARKER} SessionStart`)] },
    };
    const merged = mergeHookConfig(existing, {}, isBp);
    expect(isEmptyJsonObject(merged)).toBe(true);
  });

  it('does not mutate the existing document', () => {
    const existing = {
      hooks: { SessionStart: [bpGroup(`node .claude/hooks/${MARKER} SessionStart`)] },
    };
    mergeHookConfig(existing, generated, isBp);
    expect(existing.hooks.SessionStart[0].hooks[0].command).toContain(MARKER);
  });
});

describe('isEmptyJsonObject', () => {
  it('is true only for plain objects without keys', () => {
    expect(isEmptyJsonObject({})).toBe(true);
    expect(isEmptyJsonObject({ a: 1 })).toBe(false);
    expect(isEmptyJsonObject([])).toBe(false);
    expect(isEmptyJsonObject(null)).toBe(false);
  });
});
