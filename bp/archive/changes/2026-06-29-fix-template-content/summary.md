# Change Summary: fix-template-content

> **完成日期**: 2026-06-29
> **Change 类型**: adhoc

---

## Intent

commands/ 和 skills/ 下的模板文件（adhoc.md、continue.md、ship.md、skills/continue.md）内容过于简略，
用户或 agent 阅读后无法获得足够的操作指引。尤其：
- adhoc 模板缺少推进指引，用户不知如何从 adhoc proposal 进入下一步
- continue 模板未说明 `continue change <name>` 子命令
- ship 模板缺少 PR 正文和 release notes 的编写要求
- continue skill 模板缺失与 `src/types/state.ts` 一致的状态迁移表

本变更为四个模板补充完整的内容，使 agent 通过模板就能正确执行对应工作流。

---

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/public/templates/commands/adhoc.md` | 修改 | 新增推进指引：`continue change <name>` |
| `src/public/templates/commands/continue.md` | 修改 | 增加 `change <name>` 子命令说明及输出格式 |
| `src/public/templates/commands/ship.md` | 修改 | 充实 PR/release 内容要求 checklist |
| `src/public/templates/skills/continue.md` | 修改 | 状态机表格化，补充 adhoc-proposal 行 |

---

## 关键决策

- **adhoc 引用 continue change <name>** — adhoc 模板中的「推进」和「查看状态」均使用 `blueprint continue change <change-name>`，与 `fix-continue-args` 实现的子命令保持一致
- **ship 模板分 Phase / Milestone 两段** — Phase ship 侧重 PR 创建（scope 概述、change 列表、变更统计、checklist），Milestone ship 侧重 release（版本号、release notes、breaking changes、测试汇总）
- **continue skill 状态机表格化** — 将隐式的状态迁移逻辑显式写成表格（项目层 → Phase → 临时 change），包含对应的 slash command 和 subagent，与 `src/types/state.ts` 同步
- **无模板以外的文件修改** — scope 严格限定在模板内容充实，不改动核心逻辑或 CLI 命令

---

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ 0 errors |
| vitest run | ✅ 79/79 passed（1.2s） |
| npm run build | ✅ 65.35KB |
| adhoc 模板引用 `continue change <name>` | ✅ |
| continue 模板说明 change 子命令 | ✅ |
| ship 模板包含 PR/release 内容要求 | ✅ |
| continue skill 状态机与代码一致 | ✅ |
| `blueprint update` regenerate | ✅ 38 个平台文件 |
