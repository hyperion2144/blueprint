import { describe, expect, it } from 'vitest';
import { getApplyCommandTemplate } from '../../src/templates/workflows/apply.js';
import { getCheckSkillTemplate, getCheckCommandTemplate } from '../../src/templates/workflows/check.js';

describe('apply and check workflows auto-injection contract', () => {
  it('apply workflow omits bp context self-calls and references auto-injection', () => {
    const content = getApplyCommandTemplate().content;
    expect(content).not.toMatch(/Run `bp context apply`/);
    expect(content).toMatch(/auto-injected by the OMP Extension/i);
  });

  it('check workflow exports a bp-check command template with the workflow structure', () => {
    const command = getCheckCommandTemplate();
    expect(command.content.length).toBeGreaterThan(200);
    expect(command.content).toMatch(/## Input/);
    expect(command.content).toMatch(/## Steps/);
    expect(command.content).toMatch(/## Output/);
    expect(command.content).toMatch(/## Guardrails/);
  });

  it('check workflow references the review.md artifact and keeps its name', () => {
    const content = getCheckCommandTemplate().content;
    expect(content).toContain('review.md');
    expect(content).not.toContain('check.md');
  });

  it('check workflow routes a non-PASS verdict to bp dispatch fixer then a full re-review', () => {
    const content = getCheckCommandTemplate().content;
    expect(content).toContain('bp dispatch fixer');
    expect(content).toMatch(/full re-review/i);
    expect(content).not.toContain('bp apply --fix');
    expect(content).not.toContain('bp plan --fix');
  });

  it('check workflow has no --fix mode', () => {
    const content = getCheckCommandTemplate().content;
    expect(content).not.toContain('--fix');
  });

  it('check workflow omits bp context self-calls and references auto-injection', () => {
    const content = getCheckCommandTemplate().content;
    expect(content).not.toMatch(/Run `bp context check`/);
    expect(content).toMatch(/auto-injected by the OMP Extension/i);
  });

  it('check skill template is named bp-check', () => {
    const skill = getCheckSkillTemplate();
    expect(skill.name).toBe('bp-check');
    expect(skill.description).toContain('Triple check');
  });
});
