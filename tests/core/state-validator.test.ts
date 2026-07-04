import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateStepAdvance, isTemplateContent } from '../../src/core/state-validator.js';

const tmpDir = join(process.cwd(), 'tests/tmp-validator');
const bpDir = join(tmpDir, 'bp');

const stateMdContent = `---
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
`;

function setupBpDir() {
  mkdirSync(bpDir, { recursive: true });
  writeFileSync(join(bpDir, 'state.md'), stateMdContent, 'utf-8');
}

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
  setupBpDir();
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('validateStepAdvance', () => {
  it('项目 roadmap-defined 缺少 roadmap.md 时失败', () => {
    const result = validateStepAdvance('project', 'roadmap-defined', null, tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('roadmap.md'))).toBe(true);
  });

  it('项目 roadmap-defined 满足条件时通过', () => {
    writeFileSync(join(bpDir, 'roadmap.md'), '# Roadmap\n\nContent here', 'utf-8');
    mkdirSync(join(bpDir, 'milestones', 'm1'), { recursive: true });
    const result = validateStepAdvance('project', 'roadmap-defined', null, tmpDir);
    expect(result.valid).toBe(true);
  });

  it('phase discuss 缺失 context.md 时失败', () => {
    const phRef = 'milestones/m1/phases/p1';
    mkdirSync(join(bpDir, phRef), { recursive: true });
    const result = validateStepAdvance('phase', 'discuss', phRef, tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('context.md'))).toBe(true);
  });

  it('phase discuss context.md 存在但为模板时失败', () => {
    const phRef = 'milestones/m1/phases/p1';
    mkdirSync(join(bpDir, phRef), { recursive: true });
    writeFileSync(join(bpDir, phRef, 'context.md'), '# Context\n\n{{name}} {{date}} {{intent}}', 'utf-8');
    const result = validateStepAdvance('phase', 'discuss', phRef, tmpDir);
    expect(result.valid).toBe(false);
  });

  it('change planning 模板未填写时失败', () => {
    const chRef = 'milestones/m1/phases/p1/changes/add-feature';
    mkdirSync(join(bpDir, chRef), { recursive: true });
    writeFileSync(join(bpDir, chRef, 'design.md'), '# Design\n\n{{name}} {{date}}', 'utf-8');
    writeFileSync(join(bpDir, chRef, 'tasks.md'), '# Tasks\n\n{{name}} {{date}}', 'utf-8');
    const result = validateStepAdvance('change', 'planning', chRef, tmpDir);
    expect(result.valid).toBe(false);
  });

  it('已填写的文档通过校验', () => {
    const chRef = 'milestones/m1/phases/p1/changes/add-feature';
    mkdirSync(join(bpDir, chRef), { recursive: true });
    writeFileSync(join(bpDir, chRef, 'design.md'), '# Design\n\nImplemented with strategy pattern.', 'utf-8');
    writeFileSync(join(bpDir, chRef, 'tasks.md'), '# Tasks\n\n- [ ] task-1.1: do thing', 'utf-8');
    const result = validateStepAdvance('change', 'planning', chRef, tmpDir);
    expect(result.valid).toBe(true);
  });

  it('无显式退出条件的步骤默认通过', () => {
    const result = validateStepAdvance('project', 'unknown-step', null, tmpDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('isTemplateContent', () => {
  it('含占位符的内容为模板', () => {
    expect(isTemplateContent('# Doc\n\n{{name}} {{date}} {{intent}} {{scope}}')).toBe(true);
  });

  it('无占位符的内容非模板', () => {
    expect(isTemplateContent('# Implemented Feature\n\nFull description here.')).toBe(false);
  });

  it('仅 1-3 个占位符也判定为非模板', () => {
    expect(isTemplateContent('# Doc\n\n{{name}}')).toBe(false);
    expect(isTemplateContent('# Doc\n\n{{name}} {{date}}')).toBe(false);
  });
});
