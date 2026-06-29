# Change Summary: fix-cli-gaps

## 描述

修复 CLI 参数缺失和自动发现问题。

## 产出文件

- `src/commands/specwf-state.ts` (重写) — 添加 set-milestone/set-phase/set-step 子命令
- `src/core/continue.ts` (重写) — 添加 hint 字段，milestone-shipped 时引导创建新 milestone
- `src/commands/specwf-continue.ts` (更新) — 输出 hint 内容

## 验证

- [x] specwf state set-milestone m2-claude-code → 切换到 m2，状态 phase-discuss
- [x] specwf state show → 显示当前完整状态
- [x] specwf continue（milestone-shipped）→ 显示 hint 💡
- [x] tsc + vitest 79/79
