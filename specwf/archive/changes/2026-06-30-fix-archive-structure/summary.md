# Change Summary: fix-archive-structure

> **完成日期**: 2026-06-30
> **Change 类型**: adhoc

## Intent

归档目录结构混乱——change 和 milestone 混在 archive/ 根目录。archive 命令不会 git rm 旧路径。

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| src/core/file-tree.ts | 修改 | archiveChangeDir→archive/changes/、listArchived→archive/changes/ |
| src/commands/specwf-archive.ts | 修改 | 归档后自动 git rm 旧路径 |
| tests/integration/e2e.test.ts | 修改 | archive 断言路径更新 |

## 关键决策

- change 归档到 archive/changes/，milestone 归档到 archive/milestones/
- git rm 使用 execSync 同步执行，失败不阻塞

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ |
| vitest run | ✅ 79/79 |
| npm run build | ✅ |
