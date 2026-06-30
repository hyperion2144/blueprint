# 交付

Phase 级别的交付流水线：将已验证归档的 Change 合入主分支。Ship 分两级——**Phase ship** 创建 PR 并更新 state.md 标记为 shipped；**Milestone ship** 在里程碑全部 Phase 完成后打 release tag 并更新版本号。

**子代理**: 无（由主工作流直接执行）

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前处于 ship 阶段。运行 `specwf continue` 校验前置条件。

### 步骤 2：获取上下文

```bash
specwf context ship
```

读取输出的文件清单。


## 前置条件

确认以下就绪状态：

- [ ] 当前 Phase 内所有 Change 的 verification.md 状态为 `passed`
- [ ] 所有 Change 已 archive（delta-specs 已合并、代码认知已回灌）
- [ ] 没有未合并的 delta-spec 冲突
- [ ] 测试通过（`vitest run`）、构建通过

## Phase ship

合并 Change 分支、创建 PR、更新 state.md：

```bash
git checkout -b ship/ph-<phase-name>
git merge --squash <phase-branch>
git commit -m "feat(<phase>): <phase-title>"
git push origin ship/ph-<phase-name>
```

PR 正文应包含：

- **Phase scope 概述** — 本 Phase 的目标和交付范围
- **包含的 Change 列表** — 每个 Change 的名称、scope 摘要、产出文件
- **变更统计** — 文件数、新增/删除行数
- **测试覆盖状态** — vitest run 结果摘要
- **交付 Checklist** — 所有 Change 已 verify passed、已 archive

## Milestone ship（可选）

当 Milestone 的全部 Phase 完成 ship 后，打 tag 并推送 release notes：

```bash
git tag v<major>.<minor>.<patch>
git push origin v<major>.<minor>.<patch>
```

Release notes 应包含：

- **版本号与里程碑名称**
- **变更总览** — 按 Phase 分组列出交付内容
- **Breaking changes**（如有）
- **Git diff 统计** — +/- 行数、文件数
- **测试结果汇总**

## 产出

| 产出 | 模板/格式 | 说明 |
|------|----------|------|
| PR body | `specwf template artifacts/change-summary.md` | Phase 交付摘要，作为 PR 正文 |
| state.md 更新 | `specwf template artifacts/state.md` | 标记 Phase 状态为 `shipped`，记录 PR 号和日期 |
| （Milestone）Release notes | 自由格式 | 按 Phase 分组的交付总览 |
| （Milestone）Git tag | `v<major>.<minor>.<patch>` | 语义化版本号 |

## 检查清单

- [ ] PR 已创建且包含完整信息（scope、change 列表、checklist）
- [ ] state.md 已更新为 `shipped` 枚举值，不是自由文本
- [ ] CI 通过，未强行合并失败 PR
- [ ] （Milestone）所有 Phase 已 shipped 后才打 tag
- [ ] release notes 含 breaking changes 说明

## 常见陷阱

- 不要跳过 PR 直接合并到主分支——PR 是审计轨迹的一部分
- squash merge 注意 message 保留所有 Change 信息
- CI 失败不要强行合并——修复后重试
- state.md 使用 `shipped` 枚举值，不是自由文本
- Milestone ship 前确认全部 Phase 已 shipped

## 参考

- `skills/specwf-ship/SKILL.md` — 交付工作流完整指引、验证检查项、陷阱列表

## 上下文

```bash
specwf context ship
specwf state
```

## 下一步

完成 Phase ship 后：

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```

状态机自动推进到下一 Phase 的 discuss 阶段（多 Phase Milestone）或进入 Milestone ship 决策。
