# Proposal: fix-ship-command

---

## Intent

当前 ship 流程（Phase ship = 创建 PR + 更新 state.md；Milestone ship = 发布 release tag + 更新 project.md）完全依赖人工手写 PR body 和 release notes，导致输出极薄——上一条 PR 只有变更汇总表，release notes 只有功能列表，缺以下内容：

1. **变更详情** — 每个 change 的 scope、产出文件、关键决策没有自动汇编到 PR body
2. **测试证据** — PR/release 中没有当前测试覆盖率数据（vitest run 输出）和构建产物大小
3. **兼容性/迁移说明** — 是否有 breaking change、是否需要手动 migration
4. **对比基线** — milestone ship 时缺少与上一版本的 diff 统计（文件数、行数、新增/修改/删除）

影响所有使用 specwf 的用户——每次 ship 都要手动补这些内容，或者像刚才一样产出薄薄的 PR。

本变更为 **feature enhancement**，目标是让 `specwf ship`（或等效的自动化流程）能自动生成完整的交付内容。

---

## Scope

### In scope

- 新增 `specwf ship` 子命令，自动执行 Phase ship 和 Milestone ship 的文档生成部分
- `specwf ship phase <phase-name>` — 自动生成 PR body（含 change 列表、产出文件、测试结果、checklist）
- `specwf ship milestone` — 自动生成 release notes（含 diff 统计、版本对比、breaking changes）
- ship 命令从 state.md + change 目录的 summary/design 中自动汇编内容
- 自动执行 `vitest run`（或读取最近测试结果）并把覆盖率数据嵌入 PR body
- 自动计算 git diff 统计（`git diff --stat`）嵌入 release notes

### Out of scope

- 不开 PR 本身（仍由用户手动 `gh pr create` 或 `git push`）— PR 创建是 git 操作，保持在 CLI 外更灵活
- 不修改 git tagging 逻辑（仍由用户或 git 配置处理）
- 不涉及 CI/CD 集成（后续可考虑，但不在本 change 范围内）

---

## Approach

新增 `src/commands/specwf-ship.ts` 命令文件，提供两个子命令：

```
specwf ship phase [--phase <name>]
specwf ship milestone [--milestone <name>]
```

**数据源**：
- `specwf/state.md` — 获取当前 milestone/phase 状态和 change 列表
- `specwf/milestones/<name>/phases/<phase>/summary.md` — 每个 phase 的完成摘要
- `specwf/changes/<change>/summary.md` — 每个 change 的产出明细、验证结果
- `specwf/changes/<change>/design.md` — 关键设计决策
- `git diff` — 版本间 diff 统计

**输出**：
- `ship phase` → 在终端输出 PR body 模板（markdown），用户复制粘贴
- `ship milestone` → 在终端输出 release notes（markdown），可选写入 `RELEASE.md`

**架构**：
- `src/ship/pr-builder.ts` — 从 state + change summaries 汇编 PR body
- `src/ship/release-builder.ts` — 从 milestone state + git diff 汇编 release notes
- `src/ship/test-collector.ts` — 运行/读取测试结果
- `src/commands/specwf-ship.ts` — commander 注册

---

## Must-haves

- `specwf ship phase` 输出的 PR body 必须包含：change 列表（含每个 change 的 scope 摘要）、测试结果（pass/fail + 数量）、构建状态
- `specwf ship milestone` 输出的 release notes 必须包含：版本号、变更总览、breaking changes（如有）、git diff 统计（+/- 行数、文件数）
- ship 命令读 `state.md` 和 `summary.md`，不要求用户额外传参
- 如果当前状态不是可 ship 的状态，输出明确的错误信息和当前状态
- 输出 markdown 格式，可直接粘贴到 GitHub PR/Release 正文

---

## Non-goals

- 不自动调用 `gh pr create` 或 `git push` — 给用户选择退出和审查的机会
- 不生成 changelog 文件（后续可独立考虑）
- 不自动 bump package.json 版本号
