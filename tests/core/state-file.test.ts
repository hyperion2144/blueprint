import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadState, saveState, updateState, statePath, hasState } from '../../src/core/state-file.js';
import type { StateFile } from '../../src/types/index.js';

const tmpDir = join(process.cwd(), 'tests/tmp-state');

const testStateMd = `---
project:
  name: test-project
  status: roadmap-defined
  current_milestone: m1
  current_phase: null
active_context:
  type: project
  ref: null
  step: discuss
changes: []
adhoc: []
---

# State

## 当前位置

项目层 — discuss。
`;

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(statePath(tmpDir), testStateMd, 'utf-8');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('loadState', () => {
  it('读取并验证 state.md', () => {
    const state = loadState(tmpDir);
    expect(state.project.name).toBe('test-project');
    expect(state.project.status).toBe('roadmap-defined');
    expect(state.active_context.type).toBe('project');
    expect(state.active_context.step).toBe('discuss');
    expect(state.changes).toEqual([]);
  });
});

describe('saveState', () => {
  it('写入 state.md', () => {
    const state: StateFile = {
      project: { name: 'new', status: 'researched', current_milestone: null, current_phase: null },
      active_context: { type: 'project', ref: null, step: 'roadmap' },
      changes: [],
      adhoc: [],
    };
    saveState(tmpDir, state);
    const loaded = loadState(tmpDir);
    expect(loaded.project.name).toBe('new');
    expect(loaded.project.status).toBe('researched');
  });
});

describe('updateState', () => {
  it('修改并写回', () => {
    updateState(tmpDir, (state) => {
      state.project.status = 'researched';
      state.active_context.step = 'roadmap';
    });
    const loaded = loadState(tmpDir);
    expect(loaded.project.status).toBe('researched');
    expect(loaded.active_context.step).toBe('roadmap');
  });
});

describe('hasState', () => {
  it('存在时返回 true', () => {
    expect(hasState(tmpDir)).toBe(true);
  });

  it('不存在时返回 false', () => {
    expect(hasState(join(tmpDir, 'nonexistent'))).toBe(false);
  });
});
