# Change Summary: fix-change-summary

> **完成日期**: 2026-06-30
> **Change 类型**: adhoc

---

## Intent

每个 change 完成后没有总结文档。阶段总结需要手动汇总 change 产出，容易遗漏。

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| src/public/templates/artifacts/change-summary.md | 创建 | Change 级别 summary 模板 |
| src/public/templates/agents/executor.md | 修改 | 加 Step 5 + 模板引用 |
| src/commands/specwf-archive.ts | 修改 | archive 时检查 summary.md |
| src/commands/specwf-template.ts | 修改 | 注册 change-summary 类型 + 修复 --dir 文件名 bug |

## 关键决策

- Change 级 summary 独立于 Phase 级 summary，内容更精简（产出文件 + 决策 + 验证）
- executor agent 完成后执行 `specwf template change-summary` 获取模板
- archive 命令只 warning 不阻断，保证向后兼容

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ 0 errors |
| vitest run | ✅ 79/79 passed |
| npm run build | ✅ 76KB |
