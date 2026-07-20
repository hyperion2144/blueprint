import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ContextRefRowSchema } from '../../src/types/context-refs.js';
import { parseContextJsonl, validateContextJsonl } from '../../src/core/context-refs.js';

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

describe('context.jsonl parsing', () => {
  it('keeps valid rows in source order while reporting malformed line numbers', () => {
    const result = parseContextJsonl([
      '{"file":"first.md","reason":"first"}',
      '{not-json}',
      '{"file":"third.md","reason":"third"}',
    ].join('\n'));

    expect(result.rows.map((row) => row.file)).toEqual(['first.md', 'third.md']);
    expect(result.errors).toEqual([
      expect.objectContaining({ line: 2, code: 'PARSE_ERROR' }),
    ]);
  });
});

describe('context.jsonl path and range validation', () => {
  it('rejects unresolved files and ranges outside file bounds', () => {
    const tmpRoot = join(process.cwd(), 'tests/tmp-context-refs');
    const bpDir = join(tmpRoot, 'bp');
    mkdirSync(bpDir, { recursive: true });
    writeFileSync(join(tmpRoot, 'existing.md'), 'one\ntwo\n', 'utf-8');

    try {
      const rows = [
        ContextRefRowSchema.parse({ file: 'missing.md', reason: 'missing reference' }),
        ContextRefRowSchema.parse({ file: 'existing.md', reason: 'bad range', read: 'range', range: [1, 99] }),
      ];
      const result = validateContextJsonl(rows, { bpDir, currentPhase: 'plan' });
      expect(result.valid).toBe(false);
      expect(result.errors).toEqual([
        expect.objectContaining({ code: 'PATH_UNRESOLVED' }),
        expect.objectContaining({ code: 'RANGE_OOB' }),
      ]);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});

describe('context.jsonl phase filtering', () => {
  it('silently drops rows for other phases and keeps all-phase rows', () => {
    const tmpRoot = join(process.cwd(), 'tests/tmp-context-phase');
    const bpDir = join(tmpRoot, 'bp');
    mkdirSync(bpDir, { recursive: true });
    writeFileSync(join(tmpRoot, 'plan.md'), 'plan\n', 'utf-8');
    writeFileSync(join(tmpRoot, 'apply.md'), 'apply\n', 'utf-8');

    try {
      const rows = [
        ContextRefRowSchema.parse({ file: 'plan.md', reason: 'plan only', phase: 'plan' }),
        ContextRefRowSchema.parse({ file: 'apply.md', reason: 'apply only', phase: 'apply' }),
        ContextRefRowSchema.parse({ file: 'plan.md', reason: 'always', phase: 'all' }),
      ];
      const result = validateContextJsonl(rows, { bpDir, currentPhase: 'plan' });
      expect(result.valid).toBe(true);
      expect(result.rows.map((row) => row.reason)).toEqual(['plan only', 'always']);
      expect(result.filteredOut).toEqual({ total: 3, byPhase: 1 });
      expect(result.errors).toHaveLength(0);
    } finally {
      rmSync(tmpRoot, { recursive: true, force: true });
    }
  });
});
