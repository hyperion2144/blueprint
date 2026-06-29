import { describe, it, expect } from 'vitest';
import { parseHeadings, findHeading, findHeadingsByPrefix } from '../../src/parser/heading-tree.js';

describe('parseHeadings', () => {
  it('解析多级 heading tree', () => {
    const md = `# Title

内容

## Section A

A 的内容

### Sub A1

子内容

## Section B

B 的内容`;

    const tree = parseHeadings(md);
    expect(tree).toHaveLength(1);
    expect(tree[0].text).toBe('Title');
    expect(tree[0].level).toBe(1);
    expect(tree[0].children).toHaveLength(2);

    const sectionA = tree[0].children[0];
    expect(sectionA.text).toBe('Section A');
    expect(sectionA.level).toBe(2);
    expect(sectionA.children).toHaveLength(1);
    expect(sectionA.children[0].text).toBe('Sub A1');
    expect(sectionA.children[0].level).toBe(3);

    const sectionB = tree[0].children[1];
    expect(sectionB.text).toBe('Section B');
  });

  it('heading 下的 content 不含子 heading', () => {
    const md = `## A

A 的内容

### B

B 的内容`;

    const tree = parseHeadings(md);
    expect(tree[0].content).toContain('A 的内容');
    expect(tree[0].content).not.toContain('B 的内容');
    expect(tree[0].children[0].content).toContain('B 的内容');
  });

  it('空文件返回空数组', () => {
    expect(parseHeadings('')).toEqual([]);
  });

  it('无 heading 的纯文本返回空数组', () => {
    expect(parseHeadings('纯文本\n无 heading')).toEqual([]);
  });

  it('多个顶层 heading', () => {
    const md = `# A
内容 A
# B
内容 B`;
    const tree = parseHeadings(md);
    expect(tree).toHaveLength(2);
    expect(tree[0].text).toBe('A');
    expect(tree[1].text).toBe('B');
  });

  it('正确记录行号', () => {
    const md = `第一行\n第二行\n## A\n内容`;
    const tree = parseHeadings(md);
    expect(tree[0].line).toBe(3);
  });
});

describe('findHeading', () => {
  it('查找存在的 heading', () => {
    const md = `# Root\n## Child\n### Deep`;
    const tree = parseHeadings(md);
    const found = findHeading(tree, 'Deep');
    expect(found).not.toBeNull();
    expect(found!.text).toBe('Deep');
  });

  it('查找不存在的 heading 返回 null', () => {
    const tree = parseHeadings('# Title');
    expect(findHeading(tree, 'NotExist')).toBeNull();
  });
});

describe('findHeadingsByPrefix', () => {
  it('查找前缀匹配的 heading', () => {
    const md = `# Spec\n### Requirement: Auth\n#### Scenario: Login\n### Requirement: Payments`;
    const tree = parseHeadings(md);
    const results = findHeadingsByPrefix(tree, 'Requirement:');
    expect(results).toHaveLength(2);
    expect(results[0].text).toBe('Requirement: Auth');
    expect(results[1].text).toBe('Requirement: Payments');
  });
});
