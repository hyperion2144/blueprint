import { describe, expect, it } from 'vitest';
import { REVIEWER_PROMPT } from '../../src/templates/agents/index.js';

describe('REVIEWER_PROMPT re-validation contract', () => {
  it('re-validates every context.jsonl row reason against current code state', () => {
    expect(REVIEWER_PROMPT).toMatch(/check every row's `reason` is still satisfied/i);
  });
});
