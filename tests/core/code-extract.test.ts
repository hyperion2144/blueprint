import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractFromGitDiff, writeExtractionToSpec } from '../../src/core/code-extract.js';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const tmpDir = join(process.cwd(), 'tests/tmp-codeextract');

describe('extractFromGitDiff', () => {
  it('非 git 仓库返回 available: false', () => {
    const result = extractFromGitDiff('/nonexistent/path/for/testing');
    expect(result.available).toBe(false);
    expect(result.extractions).toEqual([]);
  });

  it('有 git 历史的仓库返回 available: true', () => {
    // Create a temp git repo with a commit + unstaged change
    const tmpRepo = join(tmpDir, 'git-repo');
    mkdirSync(tmpRepo, { recursive: true });
    execSync('git init && git config user.email test@test.com && git config user.name test', { cwd: tmpRepo });
    writeFileSync(join(tmpRepo, 'test.txt'), 'hello', 'utf-8');
    execSync('git add . && git commit -m init', { cwd: tmpRepo });
    // Make an unstaged change so git diff HEAD returns content
    writeFileSync(join(tmpRepo, 'test.txt'), 'hello world', 'utf-8');
    const result = extractFromGitDiff(tmpRepo);
    expect(result.available).toBe(true);
    rmSync(tmpRepo, { recursive: true, force: true });
  });
});

describe('writeExtractionToSpec', () => {
  beforeEach(() => {
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('写入 AUTO-EXTRACTED 标记的 spec', () => {
    const extraction = {
      domain: 'auth',
      behaviors: ['系统 SHALL 提供登录功能'],
      constraints: ['约束: if (!valid) throw Error("invalid")'],
    };

    writeExtractionToSpec(tmpDir, extraction);

    const specPath = join(tmpDir, 'auth', 'spec.md');
    expect(existsSync(specPath)).toBe(true);

    const content = readFileSync(specPath, 'utf-8');
    expect(content).toContain('AUTO-EXTRACTED');
    expect(content).toContain('SHALL');
    expect(content).toContain('登录功能');
    expect(content).toContain('END AUTO-EXTRACTED');
  });

  it('追加到已有 spec 文件', () => {
    const extraction1 = {
      domain: 'auth',
      behaviors: ['行为 A'],
      constraints: [],
    };
    const extraction2 = {
      domain: 'auth',
      behaviors: ['行为 B'],
      constraints: [],
    };

    writeExtractionToSpec(tmpDir, extraction1);
    writeExtractionToSpec(tmpDir, extraction2);

    const content = readFileSync(join(tmpDir, 'auth', 'spec.md'), 'utf-8');
    // Both extractions should appear
    expect(content).toContain('行为 A');
    expect(content).toContain('行为 B');
  });
});
