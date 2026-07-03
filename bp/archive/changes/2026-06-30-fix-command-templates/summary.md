# Change Summary: fix-command-templates

> **完成日期**: 2026-06-30
> **Change 类型**: adhoc

---

## Intent

全部 16 个 OMP command 模板内容单薄，缺少子代理引用、模板引用、推进指引。

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| src/public/templates/commands/*.md | 修改 | 全部 16 个 command 模板重写 |

## 关键决策

- 统一格式：描述/子代理/产出+模板/上下文/推进/技能
- 每个产出标注 `blueprint template <type>` 获取方式
- 使用表格布局，清晰易读

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ |
| vitest run | ✅ 79/79 |
| npm run build | ✅ |
| 16 个 command 全部更新 | ✅ |
