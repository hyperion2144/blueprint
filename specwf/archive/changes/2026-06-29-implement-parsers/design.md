# Design: implement-parsers

## 目标

实现 4 个解析器：yaml.ts / frontmatter.ts / heading-tree.ts / spec-parser.ts，各自带单元测试。

## 依赖关系

```
yaml.ts          ← 无依赖
frontmatter.ts   ← 无依赖（gray-matter 内部用 js-yaml，但我们不暴露）
heading-tree.ts  ← 无依赖（纯字符串解析）
spec-parser.ts   ← 依赖 heading-tree.ts（从 heading tree 提取 spec 结构）
```

可并行：yaml.ts + frontmatter.ts + heading-tree.ts 三个独立。spec-parser.ts 依赖 heading-tree.ts。

## 接口设计

（参见 context.md D6-D9）

## 测试策略

每个解析器测试：
- 正常解析
- 边界情况（空文件、无 frontmatter、无 heading）
- 写回保留格式（yaml/frontmatter）
