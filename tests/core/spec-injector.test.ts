import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateContext, formatContextTerminal, formatContextCompactJson, formatContextCompact, generateCompactContext } from '../../src/core/spec-injector.js';
import type { CompactContext } from '../../src/types/spec-injector.js';

const tmpDir = join(process.cwd(), 'tests/tmp-injector');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
  mkdirSync(join(tmpDir, 'specs', 'auth'), { recursive: true });
  mkdirSync(join(tmpDir, 'conventions'), { recursive: true });
  writeFileSync(join(tmpDir, 'specs', 'auth', 'spec.md'), '# Auth Spec', 'utf-8');
  writeFileSync(join(tmpDir, 'conventions', 'coding.md'), '# Coding', 'utf-8');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('generateContext', () => {
  it('injects all global specs and conventions', () => {
    const result = generateContext(tmpDir, 'research');
    expect(result.step).toBe('research');
    expect(result.globalSpecs.length).toBeGreaterThan(0);
    expect(result.globalSpecs[0].path).toContain('specs/');
    expect(result.conventions.length).toBeGreaterThan(0);
  });

  it('injects change artifacts when changeName provided', () => {
    mkdirSync(join(tmpDir, 'changes', 'add-auth'), { recursive: true });
    writeFileSync(join(tmpDir, 'changes', 'add-auth', 'proposal.md'), '# Proposal', 'utf-8');
    const result = generateContext(tmpDir, 'plan', 'add-auth');
    expect(result.changeArtifacts.length).toBeGreaterThan(0);
    expect(result.changeArtifacts[0].path).toContain('add-auth');
    expect(result.scope.ref).toBe('add-auth');
  });
});

describe('formatContextTerminal', () => {
  it('formats for terminal output', () => {
    const result = generateContext(tmpDir, 'research');
    const output = formatContextTerminal(result);
    expect(output).toContain('step: research');
    expect(output).toContain('specs/');
    expect(output).toContain('Usage:');
  });
});

// ── Compact Context Tests ──────────────────────────────────────

describe('formatContextCompactJson [T-5]', () => {
  it('round-trips through JSON.parse (excluding generatedAt)', () => {
    const input: CompactContext = {
      specs: [{ path: 'bp/specs/auth/spec.md', title: 'Auth Spec', lineCount: 42 }],
      conventions: [{ path: 'bp/conventions/coding.md', title: 'Coding Conventions', lineCount: 15 }],
      activeChange: null,
      rules: [{ artifact: 'proposal', text: 'Must include acceptance criteria' }],
      generatedAt: '2026-07-19T12:00:00.000Z',
    };
    const output = formatContextCompactJson(input);
    const parsed = JSON.parse(output);
    expect(parsed.specs).toEqual(input.specs);
    expect(parsed.conventions).toEqual(input.conventions);
    expect(parsed.rules).toEqual(input.rules);
    expect(parsed.generatedAt).toBeDefined();
  });
});

describe('formatContextCompact [T-4]', () => {
  it('formats CompactContext as <bp-context> markdown block', () => {
    const ctx: CompactContext = {
      specs: [{ path: 'specs/auth/spec.md', title: 'Auth Spec', lineCount: 10 }],
      conventions: [],
      activeChange: null,
      rules: [{ artifact: 'proposal', text: 'Use the bp commit command' }],
      generatedAt: '2026-07-19T00:00:00.000Z',
    };
    const output = formatContextCompact(ctx);
    expect(output).toMatch(/^<bp-context>/);
    expect(output).toMatch(/<\/bp-context>$/);
    expect(output).toContain('specs/auth/spec.md');
    expect(output).toMatch(/- artifact: .*Use the bp commit command/);
  });
});

describe('generateCompactContext', () => {
  it('activeChange is null when every change is archived [T-3]', () => {
    const bpDir = join(tmpDir, 't3-all-archived');
    rmSync(bpDir, { recursive: true, force: true });
    mkdirSync(join(bpDir, 'changes', 'old-change'), { recursive: true });
    writeFileSync(join(bpDir, 'changes', 'old-change', 'tasks.md'), 'status: archived\n# Old Task\n', 'utf-8');
    writeFileSync(join(bpDir, 'config.yaml'), 'version: 2\n', 'utf-8');
    const result = generateCompactContext(bpDir);
    expect(result.activeChange).toBeNull();
  });

  it('extracts title from H1/H2 and falls back to file stem [T-2]', () => {
    writeFileSync(join(tmpDir, 'specs', 'foo.md'), '# My Title\n\nSome content\n\nMore lines\n', 'utf-8');
    writeFileSync(join(tmpDir, 'specs', 'bar.md'), 'Plain prose\n\nNo heading\n', 'utf-8');
    writeFileSync(join(tmpDir, 'specs', 'h2-test.md'), '## Secondary Heading\n\nContent\n', 'utf-8');
    const result = generateCompactContext(tmpDir);
    const foo = result.specs.find((s) => s.path.endsWith('/foo.md'));
    const bar = result.specs.find((s) => s.path.endsWith('/bar.md'));
    const h2 = result.specs.find((s) => s.path.endsWith('/h2-test.md'));
    expect(foo).toBeDefined();
    expect(foo!.title).toBe('My Title');
    expect(bar).toBeDefined();
    expect(bar!.title).toBe('bar');
    expect(h2).toBeDefined();
    expect(h2!.title).toBe('Secondary Heading');
  });

  it('returns full shape with specs, conventions, activeChange, rules [T-1]', () => {
    const compactDir = join(tmpDir, 'compact-fixture');
    mkdirSync(join(compactDir, 'specs', 'auth'), { recursive: true });
    mkdirSync(join(compactDir, 'specs', 'api'), { recursive: true });
    writeFileSync(join(compactDir, 'specs', 'auth', 'spec.md'), '# Auth Spec\nLine 2\nLine 3', 'utf-8');
    writeFileSync(join(compactDir, 'specs', 'api', 'spec.md'), '# API Design\nLine 2', 'utf-8');
    writeFileSync(join(compactDir, 'specs', 'spec3.md'), 'No heading line\nContent line', 'utf-8');
    mkdirSync(join(compactDir, 'conventions'), { recursive: true });
    writeFileSync(join(compactDir, 'conventions', 'coding.md'), '# Coding Conventions\nLine 2', 'utf-8');
    writeFileSync(join(compactDir, 'conventions', 'testing.md'), '# Testing Conventions', 'utf-8');
    mkdirSync(join(compactDir, 'changes', 'active-change'), { recursive: true });
    writeFileSync(join(compactDir, 'changes', 'active-change', 'proposal.md'), '# Active Proposal', 'utf-8');
    writeFileSync(join(compactDir, 'changes', 'active-change', 'design.md'), '# Active Design', 'utf-8');
    writeFileSync(join(compactDir, 'changes', 'active-change', 'tasks.md'), '# Active Tasks', 'utf-8');
    mkdirSync(join(compactDir, 'changes', 'archived-change'), { recursive: true });
    writeFileSync(join(compactDir, 'changes', 'archived-change', 'tasks.md'), 'status: archived\n# Archived Task\n', 'utf-8');
    writeFileSync(join(compactDir, 'config.yaml'), 'version: 2\nrules:\n  proposal:\n    - "Proposals must include problem statement"\n  design:\n    - "Designs must include architecture diagram"\n', 'utf-8');
    const result = generateCompactContext(compactDir);
    expect(result.specs.length).toBe(3);
    expect(result.conventions.length).toBe(2);
    expect(result.activeChange).not.toBeNull();
    expect(result.activeChange!.name).toBe('active-change');
    expect(result.activeChange!.status).toBe('in_progress');
    expect(result.rules.length).toBe(2);
    expect(result.generatedAt).toBeDefined();
  });
});

describe('formatContextCompact payload budget [T-6]', () => {
  it('stays under 4 KB for 200 specs, or throws descriptive error', () => {
    const specs: CompactContext['specs'] = [];
    for (let i = 0; i < 200; i++) {
      specs.push({ path: `specs/group/spec-${i}.md`, title: `Spec ${i}`, lineCount: 50 });
    }
    const ctx: CompactContext = {
      specs, conventions: [{ path: 'conventions/coding.md', title: 'Coding', lineCount: 10 }],
      activeChange: null, rules: [{ artifact: 'test', text: 'Keep it short' }],
      generatedAt: new Date().toISOString(),
    };
    let threw = false;
    let output: string | undefined;
    try { output = formatContextCompact(ctx); }
    catch (e: unknown) { threw = true; expect((e as Error).message).toContain('payload size exceeded'); }
    if (!threw) {
      expect(output).toBeDefined();
      expect(Buffer.byteLength(output!)).toBeLessThanOrEqual(4096);
    }
  });
});
