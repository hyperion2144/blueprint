import { describe, it, expect } from 'vitest';
import { parseFrontmatter, stringifyFrontmatter } from '../../src/parser/frontmatter.js';

describe('parseFrontmatter', () => {
  it('解析 frontmatter + body', () => {
    const content = `---
name: test-agent
model: slow
tools:
  - read
  - write
---

# 系统提示

你是一个 agent。`;

    const result = parseFrontmatter(content);
    expect(result.data.name).toBe('test-agent');
    expect(result.data.model).toBe('slow');
    expect(result.data.tools).toEqual(['read', 'write']);
    expect(result.content).toContain('# 系统提示');
    expect(result.content).toContain('你是一个 agent。');
  });

  it('无 frontmatter 时返回空 data', () => {
    const content = '# 纯 Markdown\n\n无 frontmatter。';
    const result = parseFrontmatter(content);
    expect(result.data).toEqual({});
    expect(result.content).toBe('# 纯 Markdown\n\n无 frontmatter。');
  });

  it('空 frontmatter（开闭 ---）', () => {
    const content = `---
---
body`;
    const result = parseFrontmatter(content);
    expect(result.data).toEqual({});
    expect(result.content.trim()).toBe('body');
  });
});

describe('stringifyFrontmatter', () => {
  it('生成 frontmatter + body', () => {
    const result = stringifyFrontmatter(
      { name: 'test', tools: ['read', 'write'] },
      '# Body\n\n内容',
    );
    expect(result).toContain('name: test');
    expect(result).toContain('# Body');
  });

  it('生成后再解析保持一致', () => {
    const data = { name: 'round-trip', count: 42 };
    const body = '# 内容\n\n正文';
    const str = stringifyFrontmatter(data, body);
    const parsed = parseFrontmatter(str);
    expect(parsed.data.name).toBe('round-trip');
    expect(parsed.data.count).toBe(42);
    expect(parsed.content.trim()).toBe('# 内容\n\n正文');
  });
});
