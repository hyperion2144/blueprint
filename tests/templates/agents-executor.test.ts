import { describe, expect, it } from 'vitest';
import { EXECUTOR_PROMPT } from '../../src/templates/agents/index.js';

describe('EXECUTOR_PROMPT auto-injection contract', () => {
  it('tells the executor that context is auto-injected and forbids bp context self-calls', () => {
    expect(EXECUTOR_PROMPT).toMatch(/do not call `bp context <step>`/i);
    expect(EXECUTOR_PROMPT).toMatch(/auto[- ]injected by the OMP Extension/i);
  });

  it('refuses to start when a context.jsonl row file is missing on disk', () => {
    expect(EXECUTOR_PROMPT).toMatch(/refuse to start work when a row's `file:` is missing on disk/i);
  });
});
