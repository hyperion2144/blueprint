import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateChange } from '../../src/core/artifact-validator.js';

describe('validateChange context.jsonl gate', () => {
  it('surfaces invalid context rows with source line numbers', () => {
    const bpDir = join(process.cwd(), 'tests/tmp-artifact-validator');
    const changeDir = join(bpDir, 'changes', 'invalid-context');
    mkdirSync(changeDir, { recursive: true });
    writeFileSync(
      join(changeDir, 'context.jsonl'),
      '{"file":"missing.md","reason":"not on disk"}\n{not-json}\n',
      'utf-8',
    );

    try {
      const result = validateChange(bpDir, 'invalid-context');
      expect(result.contextJsonl.valid).toBe(false);
      expect(result.contextJsonl.errors).toEqual([
        expect.objectContaining({ line: 1, code: 'PATH_UNRESOLVED' }),
        expect.objectContaining({ line: 2, code: 'PARSE_ERROR' }),
      ]);
    } finally {
      rmSync(bpDir, { recursive: true, force: true });
    }
  });
});
