import { describe, it, expect } from 'vitest';
import { mergeDeltaSpec, fingerprint } from '../../src/core/delta-merge.js';

describe('fingerprint', () => {
  it('计算 SHA-256', () => {
    const fp = fingerprint('test content');
    expect(fp).toHaveLength(64);
    expect(fp).toMatch(/^[0-9a-f]+$/);
  });

  it('相同内容指纹相同', () => {
    expect(fingerprint('abc')).toBe(fingerprint('abc'));
  });

  it('不同内容指纹不同', () => {
    expect(fingerprint('abc')).not.toBe(fingerprint('xyz'));
  });
});

describe('mergeDeltaSpec', () => {
  it('指纹匹配时直接替换', () => {
    const base = '# Spec\n\n## A\n\nold content';
    const delta = '# Spec\n\n## A\n\nnew content';
    const fp = fingerprint(base);
    const result = mergeDeltaSpec(base, delta, fp);
    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.merged).toBe(delta);
    }
  });

  it('新增 section 被合并', () => {
    const base = '# Spec\n\n## A\n\ncontent A';
    const delta = '# Spec\n\n## A\n\ncontent A\n\n## B\n\ncontent B';
    const result = mergeDeltaSpec(base, delta);
    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.merged).toContain('content A');
      expect(result.merged).toContain('## B');
      expect(result.merged).toContain('content B');
    }
  });

  it('相同 content 不同子 section 时合并子节点', () => {
    const base = '# Spec\n\n## A\n\ncontent A\n\n### Sub A\n\nsub content';
    const delta = '# Spec\n\n## A\n\ncontent A\n\n### Sub A\n\nsub content\n\n### Sub B\n\nnew sub';
    const result = mergeDeltaSpec(base, delta);
    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.merged).toContain('Sub B');
      expect(result.merged).toContain('new sub');
    }
  });

  it('纯追加 content 可自动合并', () => {
    const base = '# Spec\n\n## A\n\nline 1\nline 2';
    const delta = '# Spec\n\n## A\n\nline 1\nline 2\nline 3';
    const result = mergeDeltaSpec(base, delta);
    expect(result.type).toBe('ok');
    if (result.type === 'ok') {
      expect(result.merged).toContain('line 1');
      expect(result.merged).toContain('line 2');
      expect(result.merged).toContain('line 3');
    }
  });

  it('冲突 content 标记 conflict', () => {
    const base = '# Spec\n\n## A\n\nline 1\nline 2';
    const delta = '# Spec\n\n## A\n\nline 1\nreplaced line';
    const result = mergeDeltaSpec(base, delta);
    expect(result.type).toBe('conflict');
    if (result.type === 'conflict') {
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts[0].section).toBe('A');
    }
  });
});
