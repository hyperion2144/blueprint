import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFileSync, execSync } from 'node:child_process';
import { existsSync, readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
let testDir: string;

/** Run bp CLI command in testDir. Uses execFileSync for shell safety. */
function cli(...args: string[]): string {
  return execFileSync('node', [cliPath, ...args], {
    encoding: 'utf-8', cwd: testDir, timeout: 15000,
  });
}

function write(relPath: string, content: string): void {
  const full = join(testDir, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content);
}

function remove(relPath: string): void {
  const full = join(testDir, relPath);
  if (existsSync(full)) rmSync(full, { recursive: true, force: true });
}

function git(args: string): string {
  return execSync(`git ${args}`, { encoding: 'utf-8', cwd: testDir });
}

describe('bp commit command', () => {
  beforeAll(() => {
    testDir = join(tmpdir(), `bp-commit-test-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });

    // Initialize git repo with user config
    git('init');
    git('config user.name test');
    git('config user.email test@test.com');

    // Create minimal bp/ project structure
    write('bp/project.yml', [
      'version: 1',
      'platform: [omp]',
      'profile: standard',
      'context: test',
      'workflow: {}',
      '',
    ].join('\n'));
    write('bp/state.md', [
      '---',
      'project:',
      '  name: test-project',
      '  status: roadmap-defined',
      '  current_milestone: null',
      '  current_phase: null',
      'active_context:',
      '  type: milestone',
      '  ref: null',
      '  step: null',
      'changes: []',
      'adhoc: []',
      '---',
      '',
    ].join('\n'));
  });

  afterAll(() => {
    if (testDir && existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('commit basic message succeeds', () => {
    write('src/init.ts', 'export const x = 1;\n');
    git('add src/init.ts');

    const output = cli('commit', 'feat: test');
    const result = JSON.parse(output);

    expect(result.ok).toBe(true);
    expect(result.hash).toMatch(/^[a-f0-9]{7,}$/);
    expect(result.message).toBe('feat: test');
    // files=0 because no --files was passed; used staged changes
    expect(result.files).toBe(0);
  });

  it('commit with --files only stages specified files', () => {
    write('src/a.ts', 'export const a = 1;\n');

    const output = cli('commit', 'feat: a', '--files', 'src/a.ts');
    const result = JSON.parse(output);

    expect(result.ok).toBe(true);
    expect(result.hash).toMatch(/^[a-f0-9]{7,}$/);
    expect(result.files).toBe(1);
  });

  it('commit with doc filtering and commitDocs disabled', () => {
    // Override project.yml with commitDocs disabled
    write('bp/project.yml', [
      'version: 1',
      'platform: [omp]',
      'profile: standard',
      'context: test',
      'workflow:',
      '  commitDocs: false',
      '',
    ].join('\n'));
    write('bp/x.md', '# test doc\n');

    const output = cli('commit', 'doc', '--files', 'bp/x.md');

    expect(output).toContain('commit_docs is disabled');
    expect(output).toContain('bp/x.md');
  });

  it('commit message with special chars works', () => {
    // project.yml still has commitDocs:false from previous test,
    // but src/ files are not filtered as docs, so commit proceeds
    write('src/escape.ts', 'export const e = 1;\n');

    const output = cli('commit', 'feat: fix #123 & escape test', '--files', 'src/escape.ts');
    const result = JSON.parse(output);

    expect(result.ok).toBe(true);
    expect(result.hash).toMatch(/^[a-f0-9]{7,}$/);
    expect(result.message).toBe('feat: fix #123 & escape test');
  });
});
