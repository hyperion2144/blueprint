import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { validateStepAdvance, isTemplateContent } from '../../src/core/state-validator.js';

const tmpDir = join(process.cwd(), 'tests/tmp-validator');
const bpDir = join(tmpDir, 'bp');

const stateMdContent = `---
project:
  status: roadmap
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
  it('project roadmap fails without roadmap.md', () => {
    const result = validateStepAdvance('project', 'roadmap', null, tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('roadmap.md'))).toBe(true);
  });

  it('project roadmap passes with roadmap.md', () => {
    writeFileSync(join(bpDir, 'roadmap.md'), '# Roadmap: test\n\n## Md-1: Core [ACTIVE]\n\n### Ph-1.1: Engine [NOT_STARTED]\n', 'utf-8');
    mkdirSync(join(bpDir, 'milestones', 'm1'), { recursive: true });
    const result = validateStepAdvance('project', 'roadmap', null, tmpDir);
    expect(result.valid).toBe(true);
  });

  it('phase discuss fails without context.md', () => {
    const phRef = 'milestones/m1/phases/p1';
    mkdirSync(join(bpDir, phRef), { recursive: true });
    const result = validateStepAdvance('phase', 'discuss', phRef, tmpDir);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('context.md'))).toBe(true);
  });

  it('phase discuss context.md is template fails', () => {
    const phRef = 'milestones/m1/phases/p1';
    mkdirSync(join(bpDir, phRef), { recursive: true });
    writeFileSync(join(bpDir, phRef, 'context.md'), '# Context\n\n{{name}} {{date}} {{intent}}', 'utf-8');
    const result = validateStepAdvance('phase', 'discuss', phRef, tmpDir);
    expect(result.valid).toBe(false);
  });

  it('change planning template fails', () => {
    const chRef = 'milestones/m1/phases/p1/changes/add-feature';
    mkdirSync(join(bpDir, chRef), { recursive: true });
    writeFileSync(join(bpDir, chRef, 'design.md'), '# Design\n\n{{name}} {{date}}', 'utf-8');
    writeFileSync(join(bpDir, chRef, 'tasks.md'), '# Tasks\n\n{{name}} {{date}}', 'utf-8');
    const result = validateStepAdvance('change', 'planning', chRef, tmpDir);
    expect(result.valid).toBe(false);
  });

  it('filled documents pass PEG validation', () => {
    const chRef = 'milestones/m1/phases/p1/changes/add-feature';
    mkdirSync(join(bpDir, chRef), { recursive: true });
    writeFileSync(join(bpDir, chRef, 'proposal.md'), '# Proposal: add-feature\n\n## Intent\ntest\n\n## References\n- FR-1: test  (bp/requirements.md)\n\n## Deliverables\n- PR-1: login  refs: FR-1\n  Source: FR-1 (bp/requirements.md)\n  System SHALL login.\n  Verify: POST login.\n', 'utf-8');
    writeFileSync(join(bpDir, chRef, 'design.md'), '# Design: add-feature\n\n## Design Items\n- DS-1: Comp\n  refs: PR-1\n  Source: PR-1 (proposal.md)\n  desc\n\n## Architecture\nsimple\n', 'utf-8');
    writeFileSync(join(bpDir, chRef, 'tasks.md'), '# Tasks: add-feature\n\n## Wave 1: Core\n- [ ] T-1: [type:behavior] do thing\n  - **refs**: DS-1\n  - **files**: src/core/feature.ts\n  - **spec_ref**: specs/x/spec.md\n  - **acceptance**: works\n', 'utf-8');
    // Planning step validates design.md and tasks.md with PEG
    const result = validateStepAdvance('change', 'planning', chRef, tmpDir);
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('steps without exit criteria pass by default', () => {
    const result = validateStepAdvance('project', 'unknown-step', null, tmpDir);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe('isTemplateContent', () => {
  it('content with placeholders is template', () => {
    expect(isTemplateContent('# Doc\n\n{{name}} {{date}} {{intent}} {{scope}}')).toBe(true);
  });

  it('content without placeholders is not template', () => {
    expect(isTemplateContent('# Implemented Feature\n\nFull description here.')).toBe(false);
  });

  it('1-3 placeholders also count as template', () => {
    expect(isTemplateContent('# Doc\n\n{{name}}')).toBe(false);
    expect(isTemplateContent('# Doc\n\n{{name}} {{date}}')).toBe(false);
  });
});
