# 交付

Phase 级别的交付流水线：将已验证归档的 Change 合入主分支。Ship 分两级——Phase ship 创建 PR 更新 state.md；Milestone ship 打 release tag 更新版本号。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 步骤 2：获取上下文

```bash
specwf context ship
```

读取输出的文件清单。

### 步骤 3：确认前置条件

- [ ] 当前 Phase 内所有 Change 的 verification.md 状态为 `passed`
- [ ] 所有 Change 已 archive
- [ ] 没有未合并的 delta-spec 冲突
- [ ] 测试通过、构建通过

### 步骤 4：Phase ship

```bash
git checkout -b ship/ph-<phase-name>
git merge --squash <phase-branch>
git commit -m "feat(<phase>): <phase-title>"
git push origin ship/ph-<phase-name>
```

PR 正文应包含：Phase scope 概述、Change 列表、变更统计、测试状态、交付 Checklist。

更新 state.md 标记 Phase 状态为 `shipped`。

### 步骤 5：Milestone ship（可选）

当 Milestone 的全部 Phase 完成 ship 后：

```bash
git tag v<major>.<minor>.<patch>
git push origin v<major>.<minor>.<patch>
```

Release notes 应包含：版本号、变更总览（按 Phase 分组）、breaking changes、diff 统计、测试结果。

### 步骤 6：查看产出

| 产出 | 说明 |
|------|------|
| PR body | Phase 交付摘要 |
| state.md 更新 | 标记 Phase 为 shipped |
| （可选）Git tag | 语义化版本号 |

### 步骤 7：推进

```bash
specwf continue
```

进入下一 Phase 的 discuss 或完成 Milestone。

技能文件：`.omp/skills/specwf-ship/SKILL.md`
