import { describe, expect, it } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { validateChange, hasPlaceholders, hasSection, validateProposal, validateDesign, validateTasks } from '../../src/core/artifact-validator.js';

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

describe('hasPlaceholders', () => {
  it('returns true when content has {{...}} placeholders', () => {
    expect(hasPlaceholders('Some {{placeholder}} text')).toBe(true);
  });

  it('returns false when content has no {{...}} placeholders', () => {
    expect(hasPlaceholders('Regular text without templates')).toBe(false);
  });
});

describe('hasSection', () => {
  it('returns true when section heading exists', () => {
    expect(hasSection('## Intent\nSome content', 'Intent')).toBe(true);
  });

  it('returns false when section heading is missing', () => {
    expect(hasSection('## Something Else\nContent', 'Intent')).toBe(false);
  });

  it('matches ## Intentional when searching for Intent (regex is loose — no word boundary)', () => {
    expect(hasSection('## Intentional\nContent', 'Intent')).toBe(true);
  });
});

describe('validateProposal', () => {
  it('reports error for unreplaced placeholders', () => {
    const result = validateProposal('## Intent\nStuff\n## Scope\nStuff\n## Deliverables\n### PR-1\nItem {{name}}\n');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Unreplaced template placeholders ({{...}}) found');
  });

  it('reports error for missing Intent section', () => {
    const result = validateProposal('## Scope\nStuff\n## Deliverables\n### PR-1\nOutput\n');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing ## Intent section');
  });

  it('passes for valid proposal with Intent, Scope, and Deliverables', () => {
    const result = validateProposal('## Intent\nDo thing\n## Scope\nThing scope\n## Deliverables\n### PR-1\nOutput\n');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('validateDesign', () => {
  it('reports error for missing Design Items section', () => {
    const result = validateDesign('## Technical Approach\nSomething\n## File Manifest\nfiles...\n');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing ## Design Items section');
  });
});

describe('validateTasks', () => {
  it('reports error for missing Wave section', () => {
    const result = validateTasks('- [ ] T-1: task one\n');
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing ## Wave section');
  });
});
