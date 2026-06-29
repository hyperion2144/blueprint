# 交付

## Phase ship

创建 PR + 更新 @specwf/state.md。

PR 正文应包含：
- Phase scope 概述
- 包含的 change 列表（每个 change 的 scope 摘要 + 产出文件）
- 变更统计（文件数、行数）
- 测试覆盖状态（vitest run 结果）
- Checklist（所有 change 已 verify passed、已 archive）

## Milestone ship

发布 release tag + 更新 @specwf/project.md 版本号。

Release notes 应包含：
- 版本号与里程碑名称
- 变更总览（按 phase 分组）
- Breaking changes（如有）
- Git diff 统计（+/- 行数、文件数）
- 测试结果汇总

## 上下文

```bash
specwf state
specwf continue change <last-change-name>
```

## 下一步

```bash
specwf continue
```
