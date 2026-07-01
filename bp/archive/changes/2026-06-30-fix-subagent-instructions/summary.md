# Change Summary: fix-subagent-instructions

> **完成日期**: 2026-06-30 | **Change 类型**: adhoc

## Intent

command 中关于子代理的描述太简略（一行"子代理: specwf-planner"），模型不知道如何派发、给什么提示词。

## 产出文件

| 文件 | 操作 |
|------|------|
| src/public/templates/commands/plan.md | 新增 ## 子代理 章节 |
| src/public/templates/commands/apply.md | 新增 ## 子代理 章节 |
| src/public/templates/commands/review.md | 新增 ## 子代理 章节 |
| src/public/templates/commands/verify.md | 新增 ## 子代理 章节 |
| src/public/templates/commands/archive.md | 新增 ## 子代理 章节 |
| src/public/templates/commands/research.md | 替换 ## Subagent → ## 子代理 |
| src/public/templates/commands/research-phase.md | 新增 ## 子代理 章节 |

## 关键决策

- 每个子代理章节包含：子代理类型 + agent 文件引用 + 提示词结构 + 产出物
- 提示词结构分三段：项目上下文 / 本次职责 / 约束条件
- 不指定派发工具（兼容 OMP/Claude Code 等不同平台）

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ |
| vitest run | ✅ 79/79 |
| npm run build | ✅ |
| 7 个 command 均含独立子代理章节 | ✅ |
