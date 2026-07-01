# Change Summary: fix-command-params

> **完成日期**: 2026-06-30 | **Change 类型**: adhoc

## Intent

command 模板没有参数说明，agent 不知道传什么参数，也不知道去查可用列表。

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| src/public/templates/commands/plan.md | 修改 | 加参数行 |
| src/public/templates/commands/apply.md | 修改 | 加参数行 |
| src/public/templates/commands/review.md | 修改 | 加参数行 |
| src/public/templates/commands/verify.md | 修改 | 加参数行 |
| src/public/templates/commands/archive.md | 修改 | 修复参数部分 |
| src/public/templates/commands/discuss.md | 修改 | 加参数部分 |
| src/public/templates/commands/research-phase.md | 修改 | 加参数行 |
| src/public/templates/commands/split.md | 修改 | 加参数部分 |
| src/commands/specwf-state.ts | 修改 | state 输出待处理列表 |

## 关键决策

- 有表格的 command 加 `**参数**` 行
- 无表格的 command 加 `## 参数` 章节
- 不传参数时通过 `specwf state` / `specwf continue` 查看可用项
