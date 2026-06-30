# Change Summary: implement-parsers

## 描述

4 个解析器（yaml + frontmatter + heading-tree + spec-parser）+ 4 个测试

## 产出文件

- `src/parser/yaml.ts`
- `src/parser/frontmatter.ts`
- `src/parser/heading-tree.ts`
- `src/parser/spec-parser.ts`
- `tests/parser/yaml.test.ts`
- `tests/parser/frontmatter.test.ts`
- `tests/parser/heading-tree.test.ts`
- `tests/parser/spec-parser.test.ts`

## 验证

- [x] tsc --noEmit 通过
- [x] vitest run 通过
