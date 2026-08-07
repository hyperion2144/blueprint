import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { getCheckCommandTemplate } from '../../src/templates/workflows/check.js';

const testDir = join(tmpdir(), `bp-check-fixer-${Date.now()}`);

function writeFile(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

beforeAll(() => {
  // Fixture change whose review.md has a non-PASS verdict and one open R1 issue.
  writeFile(
    'bp/changes/demo/review.md',
    [
      '## Overall Verdict: NEEDS_REVISION',
      '',
      '## Issues',
      '',
      '- [ ] R1 - Spec requirement X not implemented (spec)',
    ].join('\n') + '\n',
  );
});

afterAll(() => {
  rmSync(testDir, { recursive: true, force: true });
});

describe('check -> fixer -> full re-review routing (T-13)', () => {
  it('fixture review.md carries an open R1 issue (non-PASS precondition)', () => {
    const review = readFileSync(join(testDir, 'bp/changes/demo/review.md'), 'utf-8');
    expect(review).toContain('- [ ] R1');
  });

  it('routes a non-PASS verdict to bp dispatch fixer --change <name>', () => {
    const content = getCheckCommandTemplate().content;
    expect(content).toContain('bp dispatch fixer --change $1');
    expect(content).toMatch(/FAIL \/ NEEDS_REVISION/);
  });

  it('instructs a full re-review of the entire change (all three gates), not a fix-mode diff check', () => {
    const content = getCheckCommandTemplate().content;
    expect(content).toMatch(/full re-review of the entire change/);
    expect(content).toMatch(/all three gates/);
    // The check step explicitly forbids a diff-only re-check of just the fixed issues.
    expect(content).toMatch(/Do NOT re-check only the fixed issues/);
    // No fix-mode routing survives: no --fix, no bp apply --fix / bp plan --fix.
    expect(content).not.toContain('--fix');
    expect(content).not.toContain('bp apply --fix');
    expect(content).not.toContain('bp plan --fix');
  });
});
