import { describe, expect, it } from 'vitest';
import { getPlanCommandTemplate } from '../../src/templates/workflows/plan.js';

describe('plan workflow auto-injection contract', () => {
  it('does not instruct agents to run bp context plan and references auto-injection', () => {
    const content = getPlanCommandTemplate().content;
    expect(content).not.toMatch(/Run `bp context plan`/);
    expect(content).toMatch(/auto-injected by the OMP Extension/i);
  });
});
