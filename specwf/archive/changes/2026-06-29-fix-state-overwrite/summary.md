# Change Summary: fix-state-overwrite

> **完成日期**: 2026-06-29
> **Change 类型**: adhoc

---

## Intent

`saveState()` 每次写入 state.md 时均调用 `generateStateBody()` 生成全新 Markdown body，覆盖用户在 body 中编写的变更列表、历史记录、检查清单等详细内容。所有调用 `updateState`/`saveState` 的命令（change new、archive、set-milestone、set-phase、set-step）均受影响。

修复：写入前先通过 `readFrontmatterFile()` 读取现有 body，存在则保留，不存在（新文件场景，如 `specwf init`）才回退到 `generateStateBody()` 生成默认 body。

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/core/state-file.ts` | 修改 | `saveState` 增加 body 保留逻辑：优先读取现有 body，try/catch 兜底新文件 |

## 关键决策

- **try/catch fallback**：不显式检查文件是否存在，依赖 `readFrontmatterFile` 抛异常时自动回退到 `generateStateBody()`，覆盖新文件和异常场景
- **无类型变更**：不修改 `StateFile` 类型或 frontmatter schema，改动面最小化
- **不修改 `generateStateBody`**：默认 body 格式不变，仅用于新文件 fallback

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ 0 errors |
| vitest run | ✅ 79/79 passed |
| npm run build | ✅ 62.67KB |
| E2E: init → 添加 body → change new → body 保留 | ✅ |
