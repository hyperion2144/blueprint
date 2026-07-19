import { describe, expect, it } from 'vitest';
import { ContextRefRowSchema } from '../../src/types/context-refs.js';
import { parseContextJsonl } from '../../src/core/context-refs.js';

describe('context.jsonl row schema', () => {
  it('accepts a row with required file and reason fields', () => {
    const row = ContextRefRowSchema.parse({ file: 'bp/specs/auth.md', reason: 'Authentication invariant' });

    expect(row).toMatchObject({
      file: 'bp/specs/auth.md',
      reason: 'Authentication invariant',
      phase: 'all',
      read: 'full',
    });
    expect(row.range).toBeUndefined();
  });

  it('rejects rows missing file or reason', () => {
    expect(() => ContextRefRowSchema.parse({ reason: 'missing path' })).toThrow();
    expect(() => ContextRefRowSchema.parse({ file: 'auth.md' })).toThrow();
  });

  it('surfaces malformed JSON as a parse error', () => {
    const result = parseContextJsonl('{"file":"auth.md","reason":"read it"}\n{not-json}');

    expect(result.rows).toHaveLength(1);
    expect(result.errors).toEqual([
      expect.objectContaining({ line: 2, code: 'PARSE_ERROR' }),
    ]);
  });
});
