import { describe, expect, it } from 'vitest';
import { PLANNER_PROMPT } from '../../src/templates/agents/index.js';

describe('PLANNER_PROMPT context write contract', () => {
  it('instructs the planner to write context.jsonl covering every reference', () => {
    expect(PLANNER_PROMPT).toMatch(/write `context\.jsonl`/i);
    expect(PLANNER_PROMPT).toMatch(/every spec path referenced from `design\.md` and `tasks\.md`/i);
  });
});
