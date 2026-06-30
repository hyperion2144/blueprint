# 交付工作流指引

## 概述

将完成的 phase（或其变更集）交付。Ship 分为两级：(1) Ship Phase — 创建 PR + 更新 state.md；(2) Ship Milestone — 创建 release tag + 更新 project.md 版本。

Ship Phase 在每个 phase 的 change 循环全部完成后触发。Ship Milestone 在 milestone 的所有 phase 完成后触发。

## 前置条件

- 当前 phase 内所有 change 的 verify 已通过（passed 状态）
- archive 已执行

## 执行步骤

### 1. 检查交付就绪

- [ ] 所有 change 的 VERIFICATION.md 状态为 passed
- [ ] 所有 change 已 archive（delta-specs 已合并、代码认知已提取）
- [ ] 没有未合并的 delta-spec 冲突
- [ ] 测试通过、构建通过

### 2. Ship Phase

**创建 PR**：
\`\`\`
git checkout -b ship/ph-<phase-name>
git merge --squash <phase-branch>（或逐个 cherry-pick change）
git commit -m "feat(<phase>): <phase 标题>"
git push origin ship/ph-<phase-name>
\`\`\`

创建 PR：
- 标题：\`feat(<phase>): <标题>\`
- 正文包含：
  - 本 phase 的 scope 概述
  - 包含的 change 列表
  - 变更统计（文件数、行数）
  - 测试覆盖状态
  - CHECKLIST（所有 change 已 verify passed、已 archive）

PR 通过后合并到主分支。

**更新 state.md**：
\`\`\`markdown
# 状态

## Phase: <name>
- 状态: ✅ shipped
- PR: #<PR 号>
- Ship 日期: <date>
\`\`\`

### 3. Ship Milestone（可选，仅在 milestone 全部完成时）

当 milestone 的最后 phase ship 后：

\`\`\`
git tag v<major>.<minor>.<patch>
git push origin v<major>.<minor>.<patch>
\`\`\`

更新 project.md（或 readme.md）的版本号和 changelog。

### 4. 通知

（可选）在项目日志或 release notes 中记录交付内容。

## 产物

- GitHub PR（ship phase）
- \`specwf/state.md\`（更新，标记 phase 为 shipped）
- （milestone）git tag + release notes

## 验证

- [ ] PR 已创建且包含完整信息
- [ ] state.md 已更新
- [ ] CI 通过
- [ ] （milestone）tag 已创建和推送
- [ ] 主分支代码与 PR 一致

## 常见陷阱

- 不要跳过 PR 直接合并到主分支 — PR 是审计轨迹的一部分
- squash merge 要注意 squash 后的 message 包含所有 change 信息
- 如果发现 CI 失败，不要强行合并 — 修复后重试
- state.md 更新使用 \`shipped\` 枚举值，不是自由文本
- Milestone ship 前确认所有 phase 都已 shipped

## 参考

- Conventional Commits 规范（feat 类型）
- GSD Core 的 ship 流程