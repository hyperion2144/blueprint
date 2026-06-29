# 三重审查工作流指引

## 概述

对 Apply 产出的代码进行三重并行审查：规格审查、质量审查、目标审查。三重审查全部通过后才能进入 verify 阶段。

Review 由 specwf-reviewer agent 在独立上下文中并行执行。审查结果决定是否需要回 apply 修改。

## 前置条件

- apply 阶段已完成，代码已提交
- delta-specs、design.md、tasks.md、proposal.md 已就位

## 执行步骤

### 1. 并行启动三重审查

一次启动三个 reviewer agent 并行审查：
\`\`\`
task agent: specwf-reviewer × 3（并行）
  1. Spec Review — 规格符合性审查
  2. Quality Review — 代码质量审查
  3. Goal Review — 目标达成审查
\`\`\`

### 2. 规格审查（Spec Review）

**检查项**：
- [ ] delta-specs 中的每个 SHALL 场景在代码中实现
- [ ] delta-specs 中的每个 MUST 约束在代码中遵守
- [ ] 全局 specs/ 中相关的 SHALL/MUST 未被违反
- [ ] GIVEN/WHEN/THEN 场景在测试中覆盖
- [ ] 接口签名与 design.md 一致
- [ ] 异常处理覆盖 spec 中定义的错误场景

**输出**: \`reviews/spec-review.md\`
\`\`\`markdown
# 规格审查报告

## 审查结果：PASS / FAIL / CONDITIONAL_PASS

## 通过项
- SHALL-001: ✓ 已实现且测试覆盖
- ...

## 未通过项
- SHALL-003: ✗ 未处理输入为空场景
  - 严重性: HIGH / MEDIUM / LOW
  - 建议: ...

## 与全局 specs 冲突
- ...
\`\`\`

### 3. 质量审查（Quality Review）

**检查项**：
- [ ] 明显的 bug 模式（空指针、越界、竞态条件）
- [ ] 安全漏洞（注入、权限缺失、敏感信息泄露）
- [ ] 代码规范（项目约定的代码风格和模式）
- [ ] 测试质量（不是 trivial 测试，覆盖边界条件）
- [ ] 性能问题（不必要的分配、N+1 查询等）
- [ ] 错误处理（错误被吞没、错误信息不明确）

**输出**: \`reviews/quality-review.md\`
\`\`\`markdown
# 质量审查报告

## 审查结果：PASS / FAIL / CONDITIONAL_PASS

## Bug 类
- ...

## 安全类
- ...

## 规范类
- ...

## 测试质量
- ...
\`\`\`

### 4. 目标审查（Goal Review）

**检查项**：
- [ ] change proposal.md 中定义的目标已实现
- [ ] tasks.md 中所有 tasks 已完成（无论 type）
- [ ] design.md 中的方案在代码中落地
- [ ] 没有 scope creep（实现了 proposal 外的功能）
- [ ] 测试覆盖满足 change 的测试策略要求

**输出**: \`reviews/goal-review.md\`
\`\`\`markdown
# 目标审查报告

## 审查结果：PASS / FAIL / CONDITIONAL_PASS

## 目标达成
- proposal 目标 1: ✓
- ...

## 任务完成度
- tasks.md 完成: 7/7

## Scope Creep 检查
- 发现 1 处额外实现: ...
\`\`\`

### 5. 汇总结果

收集所有三份审查报告，根据 gate 配置决定是否进入 verify：

- **all-pass（默认）**：三份报告都 PASS 才进入 verify
- **severity**：没有 HIGH 严重性问题即可进入 verify
- **report-only**：审查结果仅供参考，不阻止进入 verify

任一审查 FAIL 时：
- 记录问题清单
- 回 apply 阶段修复
- 修复后重新审查涉及的部分

## 产物

- \`changes/<change-name>/reviews/spec-review.md\` — 规格审查报告
- \`changes/<change-name>/reviews/quality-review.md\` — 质量审查报告
- \`changes/<change-name>/reviews/goal-review.md\` — 目标审查报告

## 验证

- [ ] 三重审查全部完成
- [ ] gate 条件满足（根据配置）
- [ ] 审查报告写入对应目录
- [ ] FAIL 的问题在回 apply 前修复

## 常见陷阱

- 不要合并审查职责 — 规格/质量/目标是三个独立视角，必须由不同 reviewer（或至少不同上下文）执行
- 不要在审查报告里写模糊的描述 — 每个问题必须有文件/行号引用
- 不要把「风格偏好」作为 FAIL 理由 — 只有违反项目约定的才记录
- 如果条件允许，一次审查只覆盖单个 change 的 diff，不涉及全局代码
- ALL-PASS 模式下，一个 CONDITIONAL_PASS 算 FAIL

## 参考

- GSD Core 的 triple review 机制
- OpenSpec 的 review 模板
- OWASP 代码审查指南（质量审查的安全类参考）