import { describe, expect, it } from 'vitest';
import { CONTEXT_JSONL_REMINDER } from '../../src/templates/workflows/shared.js';

describe('CONTEXT_JSONL_REMINDER schema reminder', () => {
  it('names every required context.jsonl schema field', () => {
    expect(typeof CONTEXT_JSONL_REMINDER).toBe('string');
    expect(CONTEXT_JSONL_REMINDER).toMatch(/file:/);
    expect(CONTEXT_JSONL_REMINDER).toMatch(/reason:/);
    expect(CONTEXT_JSONL_REMINDER).toMatch(/phase:/);
    expect(CONTEXT_JSONL_REMINDER).toMatch(/read:/);
    expect(CONTEXT_JSONL_REMINDER).toMatch(/range:/);
  });
});
