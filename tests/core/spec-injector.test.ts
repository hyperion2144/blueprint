import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateContext, formatContextTerminal } from '../../src/core/spec-injector.js';

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
