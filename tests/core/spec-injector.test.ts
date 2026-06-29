import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { generateContext, formatContextTerminal } from '../../src/core/spec-injector.js';
import { stringifyFrontmatter } from '../../src/parser/frontmatter.js';
import { statePath } from '../../src/core/state-file.js';
import type { StateFile } from '../../src/types/index.js';

const tmpDir = join(process.cwd(), 'tests/tmp-injector');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(join(tmpDir, 'specs', 'auth'), { recursive: true });
  mkdirSync(join(tmpDir, 'conventions'), { recursive: true });
  writeFileSync(join(tmpDir, 'specs', 'auth', 'spec.md'), '# Auth Spec', 'utf-8');
  writeFileSync(join(tmpDir, 'conventions', 'coding.md'), '# Coding', 'utf-8');
  writeFileSync(join(tmpDir, 'requirements.md'), '# Requirements', 'utf-8');
  writeStateFile(tmpDir, 'project', null, 'research');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeStateFile(dir: string, type: string, ref: string | null, step: string): void {
  const state: StateFile = {
    project: { name: 'test', status: 'researched', current_milestone: null, current_phase: null },
    active_context: { type: type as StateFile['active_context']['type'], ref, step },
    changes: [],
    adhoc: [],
  };
  const body = '# State\n\n## 当前位置\n\n测试。\n';
  writeFileSync(statePath(dir), stringifyFrontmatter(state as unknown as Record<string, unknown>, body), 'utf-8');
}

describe('generateContext', () => {
  it('项目层步骤注入所有 specs + conventions + requirements', () => {
    const result = generateContext(tmpDir, 'research');
    expect(result.specs.length).toBeGreaterThan(0);
    expect(result.specs[0].path).toContain('specs/');
    expect(result.conventions.length).toBeGreaterThan(0);
    expect(result.requirements.length).toBeGreaterThan(0);
  });

  it('change 步骤注入 change 产物', () => {
    mkdirSync(join(tmpDir, 'milestones', 'm1', 'phases', 'p1', 'changes', 'add-auth'), { recursive: true });
    writeFileSync(join(tmpDir, 'milestones', 'm1', 'phases', 'p1', 'changes', 'add-auth', 'proposal.md'), '# Proposal', 'utf-8');
    writeStateFile(tmpDir, 'change', 'milestones/m1/phases/p1/changes/add-auth', 'plan');
    
    const result = generateContext(tmpDir, 'plan');
    expect(result.changeArtifacts.length).toBeGreaterThan(0);
    expect(result.changeArtifacts[0].path).toContain('add-auth');
  });
});

describe('formatContextTerminal', () => {
  it('格式化为终端输出', () => {
    const result = generateContext(tmpDir, 'research');
    const output = formatContextTerminal(result);
    expect(output).toContain('specwf context for step: research');
    expect(output).toContain('Related specs:');
    expect(output).toContain('Usage:');
  });
});
