import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { readYaml, readYamlDoc, writeYamlDoc, updateYaml, parseYaml } from '../../src/parser/yaml.js';
import { z } from 'zod';

const tmpDir = join(process.cwd(), 'tests/tmp-yaml');
const testFile = join(tmpDir, 'test.yml');

const TestSchema = z.object({
  name: z.string(),
  count: z.number(),
  nested: z.object({
    value: z.string(),
  }),
});

const testYamlContent = `# 顶层注释
name: test-project
count: 42
# 嵌套注释
nested:
  value: hello
`;

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
  writeFileSync(testFile, testYamlContent, 'utf-8');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

describe('readYaml', () => {
  it('读取并验证 YAML', () => {
    const result = readYaml(testFile, TestSchema);
    expect(result.name).toBe('test-project');
    expect(result.count).toBe(42);
    expect(result.nested.value).toBe('hello');
  });

  it('schema 验证失败时抛出错误', () => {
    const badFile = join(tmpDir, 'bad.yml');
    writeFileSync(badFile, 'name: test\n', 'utf-8');
    expect(() => readYaml(badFile, TestSchema)).toThrow();
  });
});

describe('readYamlDoc + writeYamlDoc', () => {
  it('读取并写回后保留注释', () => {
    const doc = readYamlDoc(testFile);
    writeYamlDoc(testFile, doc);
    const content = readFileSync(testFile, 'utf-8');
    expect(content).toContain('# 顶层注释');
    expect(content).toContain('# 嵌套注释');
  });
});

describe('updateYaml', () => {
  it('修改后写回保留注释', () => {
    updateYaml(testFile, (doc) => {
      doc.set('count', 100);
    });
    const content = readFileSync(testFile, 'utf-8');
    expect(content).toContain('count: 100');
    expect(content).toContain('# 顶层注释');
  });
});

describe('parseYaml', () => {
  it('解析字符串', () => {
    const result = parseYaml('name: x\ncount: 1\nnested:\n  value: y\n', TestSchema);
    expect(result.name).toBe('x');
  });
});

// 内联 readFileSync
import { readFileSync } from 'node:fs';
