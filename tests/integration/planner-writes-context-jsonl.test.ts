import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { parseContextJsonl } from '../../src/core/context-refs.js';

const cliPath = join(process.cwd(), 'bin/cli.js');
let testDir: string;

function write(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

describe('planner writes context.jsonl from design references', () => {
  beforeAll(() => {
    testDir = join(tmpdir(), `bp-planner-context-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    execSync(`node "${cliPath}" init --dir "${testDir}" --yes`, { encoding: 'utf-8', timeout: 15000 });
    write('bp/specs/auth/spec.md', '# Auth Spec\n');
    write('bp/specs/payments/spec.md', '# Payments Spec\n');
    write('bp/specs/audit/spec.md', '# Audit Spec\n');
    write('bp/conventions/coding.md', '# Coding\n');
    write('bp/conventions/test.md', '# Test\n');

    write('bp/changes/planner-context/proposal.md', '# Proposal: planner-context\n## Intent\ntest\n');
    write('bp/changes/planner-context/design.md', [
      '## Design Items',
      '### DS-1: Auth',
      '- **Source**: PR-1 (proposal.md)',
      '- **Files**: bp/specs/auth/spec.md#login',
      '### DS-2: Payments',
      '- **Source**: PR-1 (proposal.md)',
      '- **Files**: bp/specs/payments/spec.md#charge',
      '### DS-3: Audit',
      '- **Source**: PR-2 (proposal.md)',
      '- **Files**: bp/specs/audit/spec.md#trail',
      '## File Manifest',
      '| File | Action |',
      '|------|--------|',
      '| bp/conventions/coding.md | Read |',
      '| bp/conventions/test.md | Read |',
      '',
    ].join('\n'));
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('emits context.jsonl covering every spec and convention reference', () => {
    const output = execSync(`node "${cliPath}" plan planner-context --write-context`, { encoding: 'utf-8', cwd: testDir });
    const contextPath = join(testDir, 'bp', 'changes', 'planner-context', 'context.jsonl');
    expect(existsSync(contextPath)).toBe(true);
    const parsed = parseContextJsonl(readFileSync(contextPath, 'utf-8'));
    const files = parsed.rows.map((row) => row.file);
    expect(files).toEqual(
      expect.arrayContaining([
        'bp/specs/auth/spec.md',
        'bp/specs/payments/spec.md',
        'bp/specs/audit/spec.md',
        'bp/conventions/coding.md',
        'bp/conventions/test.md',
      ]),
    );
    expect(parsed.rows.length).toBeGreaterThanOrEqual(5);
    expect(output).toContain('context.jsonl');
  });
});
