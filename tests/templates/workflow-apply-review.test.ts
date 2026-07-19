import { describe, expect, it } from 'vitest';
import { getApplyCommandTemplate } from '../../src/templates/workflows/apply.js';
import { getReviewCommandTemplate } from '../../src/templates/workflows/review.js';

describe('apply and review workflows auto-injection contract', () => {
  it('apply workflow omits bp context self-calls and references auto-injection', () => {
    const content = getApplyCommandTemplate().content;
    expect(content).not.toMatch(/Run `bp context apply`/);
    expect(content).toMatch(/auto-injected by the OMP Extension/i);
  });

  it('review workflow omits bp context self-calls and references auto-injection', () => {
    const content = getReviewCommandTemplate().content;
    expect(content).not.toMatch(/Run `bp context review`/);
    expect(content).toMatch(/auto-injected by the OMP Extension/i);
  });
});
