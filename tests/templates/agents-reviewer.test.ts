import { describe, expect, it } from 'vitest';
import { REVIEWER_PROMPT } from '../../src/templates/agents/index.js';

describe('REVIEWER_PROMPT re-validation contract', () => {
  it('re-validates every context.jsonl row reason against current code state', () => {
    expect(REVIEWER_PROMPT).toMatch(/check every row's `reason` is still satisfied/i);
  });
});

describe('REVIEWER_PROMPT full-review reform (T-9)', () => {
  it('contains no fix-mode section, --fix, or [~] three-state marking', () => {
    expect(REVIEWER_PROMPT).not.toContain('## Fix Mode');
    expect(REVIEWER_PROMPT).not.toContain('--fix');
    expect(REVIEWER_PROMPT).not.toContain('[~]');
  });

  it('instructs a full triple review on every run', () => {
    expect(REVIEWER_PROMPT).toMatch(/full triple review/i);
  });
});

describe('REVIEWER_PROMPT goal review verifies the design verification items', () => {
  it('goal review verifies the DS-N Acceptance Criteria (binary pass/fail)', () => {
    expect(REVIEWER_PROMPT).toMatch(/Acceptance Criteria/i);
    expect(REVIEWER_PROMPT).toMatch(/DS-N/i);
    expect(REVIEWER_PROMPT).toMatch(/binary pass\/fail/i);
  });

  it('goal review verifies the PR-N Verify method, behavior-based not presence-based', () => {
    expect(REVIEWER_PROMPT).toMatch(/\*\*Verify\*\*:/i);
    expect(REVIEWER_PROMPT).toMatch(/behavior-based/i);
    expect(REVIEWER_PROMPT).toMatch(/not just "the code exists"/i);
  });
});
