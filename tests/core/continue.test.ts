import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { statePath } from '../../src/core/state-file.js';
import { determineNextStep, determineFromState } from '../../src/core/continue.js';
import { stringifyFrontmatter } from '../../src/parser/frontmatter.js';
import type { StateFile } from '../../src/types/index.js';

const tmpDir = join(process.cwd(), 'tests/tmp-continue');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeState(dir: string, state: StateFile): void {
  const body = '# State\n\n## 当前位置\n\n测试。\n';
  const output = stringifyFrontmatter(state as unknown as Record<string, unknown>, body);
  writeFileSync(statePath(dir), output, 'utf-8');
}

describe('determineNextStep', () => {
  it('从 grill 推进到 research', () => {
    writeState(tmpDir, {
      project: { name: 'test', status: 'grill', current_milestone: null, current_phase: null },
      active_context: { type: 'project', ref: null, step: 'research' },
      changes: [],
      adhoc: [],
    });
    const result = determineNextStep(tmpDir);
    expect(result.nextCommand).toBe('research');
    expect(result.slashCommand).toBe('/bp:research');
    expect(result.needsSubagent).toBe(true);
  });

  it('从 roadmap-defined 推进到 discuss', () => {
    writeState(tmpDir, {
      project: { name: 'test', status: 'roadmap-defined', current_milestone: 'm1', current_phase: null },
      active_context: { type: 'project', ref: null, step: 'discuss' },
      changes: [],
      adhoc: [],
    });
    const result = determineNextStep(tmpDir);
    expect(result.nextCommand).toBe('discuss');
  });
});

describe('determineFromState', () => {
  it('change-planning 推进到 apply', () => {
    const state: StateFile = {
      project: { name: 'test', status: 'change-planning', current_milestone: 'm1', current_phase: 'p1' },
      active_context: { type: 'change', ref: 'changes/test-change', step: 'planning' },
      changes: [{ name: 'test-change', status: 'planning', depends_on: [] }],
      adhoc: [],
    };
    const result = determineFromState(state);
    expect(result.nextCommand).toBe('apply');
    expect(result.slashCommand).toBe('/bp:apply');
    expect(result.needsSubagent).toBe(true);
  });

  it('change-reviewing 有多个可用步骤（archive/replan/reapply/fix）', () => {
    const state: StateFile = {
      project: { name: 'test', status: 'change-reviewing', current_milestone: 'm1', current_phase: 'p1' },
      active_context: { type: 'change', ref: 'changes/test', step: 'reviewing' },
      changes: [{ name: 'test', status: 'reviewing', depends_on: [] }],
      adhoc: [],
    };
    const result = determineFromState(state);
    expect(result.availableSteps.length).toBeGreaterThanOrEqual(2);
    const commands = result.availableSteps.map((s) => s.command);
    expect(commands).toContain('archive');
    expect(commands).toContain('replan');
  });
});
