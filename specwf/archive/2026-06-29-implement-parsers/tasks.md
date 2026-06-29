# Tasks: implement-parsers

## 1. YAML 解析器
- [ ] 1.1 src/parser/yaml.ts — readYaml + readYamlDoc + writeYamlDoc + updateYaml
- [ ] 1.2 tests/parser/yaml.test.ts — 读+验证+写回保留注释

## 2. Frontmatter 解析器
- [ ] 2.1 src/parser/frontmatter.ts — parseFrontmatter + stringifyFrontmatter + readFrontmatterFile
- [ ] 2.2 tests/parser/frontmatter.test.ts — 解析+生成+读文件

## 3. Heading Tree 解析器
- [ ] 3.1 src/parser/heading-tree.ts — parseHeadings + findHeading
- [ ] 3.2 tests/parser/heading-tree.test.ts — 多级 heading + 查找 + 空文件

## 4. Spec 解析器
- [ ] 4.1 src/parser/spec-parser.ts — parseSpec + extractSpecFromTree
- [ ] 4.2 tests/parser/spec-parser.test.ts — Purpose/Requirement/Scenario 解析

## 5. 验证
- [ ] 5.1 vitest run 全部通过
- [ ] 5.2 tsc --noEmit 通过
