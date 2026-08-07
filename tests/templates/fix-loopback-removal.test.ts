import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { getApplyCommandTemplate } from '../../src/templates/workflows/apply.js';
import { getPlanCommandTemplate } from '../../src/templates/workflows/plan.js';
import { EXECUTOR_PROMPT, PLANNER_PROMPT } from '../../src/templates/agents/index.js';
import { REVIEW_TEMPLATE } from '../../src/templates/artifacts/index.js';

describe('fix-loopback removal (T-12)', () => {
  it('apply/plan command registrations contain no --fix', () => {
    const applySrc = readFileSync(join(process.cwd(), 'src/commands/bp-apply.ts'), 'utf-8');
    const planSrc = readFileSync(join(process.cwd(), 'src/commands/bp-plan.ts'), 'utf-8');
    expect(applySrc).not.toContain('--fix');
    expect(planSrc).not.toContain('--fix');
  });

  it('apply/plan templates, agent prompts, and review template contain no --fix', () => {
    expect(getApplyCommandTemplate().content).not.toContain('--fix');
    expect(getPlanCommandTemplate().content).not.toContain('--fix');
    expect(EXECUTOR_PROMPT).not.toContain('--fix');
    expect(PLANNER_PROMPT).not.toContain('--fix');
    expect(REVIEW_TEMPLATE).not.toContain('--fix');
  });

  it('apply template routes Next to bp check (not bp review)', () => {
    const content = getApplyCommandTemplate().content;
    expect(content).toMatch(/Next: bp check \$1/);
    expect(content).not.toMatch(/bp review/);
  });
});
