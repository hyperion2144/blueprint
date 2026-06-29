# 归档工作流指引

## 概述

Change 循环的收尾阶段。负责两件事：(1) 将 delta-specs 确定性合并到全局 specs/；(2) 从代码 diff 中提取新的行为和约束，回灌到 specs/ 中。

归档完成后，Change 的工作永久记录在 specs/ 中，供后续 Change 参考和使用。

## 前置条件

- verify 阶段已通过（passed 状态）
- 合并目标分支的准备已完成（ship 阶段前）

## 执行步骤

### 1. 读取上下文

读取以下文件清单：
\`\`\`
changes/<change-name>/specs/<domain>/spec.md  — delta-specs
specs/<domain>/spec.md                         — 全局 specs（目标）
changes/<change-name>/tasks.md                 — 任务清单（确认 REFACTOR 阶段可以删除的实现细节 delta）
changes/<change-name>/VERIFICATION.md          — 验证报告（确认哪些通过了）
\`\`\`

### 2. Delta-Spec 合并

将 delta-specs 合并到全局 specs/ 中：

**合并规则**：
- **新增条目**：直接追加到对应域名的 specs/ 文件中
- **修改条目**：替换或修订全局 specs/ 中的对应 ID
- **删除条目**：从全局 specs/ 中移除（标记 \`[DELETED: <change-name>]\`）
- **冲突**：如果全局 specs/ 中的条目与 delta-spec 矛盾，标记 \`[CONFLICT: <change-name>]\` 并列出冲突双方

**合并流程**：
\`\`\`
1. 读取 changes/<change>/specs/ 下的所有 spec 文件
2. 对每个文件：
   a. 按 SHALL/MUST 编号索引
   b. 对全局 specs/ 执行新增/修改/删除
   c. 记录变更日志在 spec 文件头部
3. 处理冲突（见冲突规则）
4. 写入更新后的 specs/
\`\`\`

### 3. 代码认知提取

从代码 diff 中提取未在 delta-specs 中预写的行为和约束：

**提取来源**：
- 新增的函数、方法、模块的公共 API（类型签名、注释、实现）
- 测试中隐含的行为约束（如「一个用户只有一个 active session」）
- 配置文件、常量中的业务规则
- 错误消息中体现的领域概念

**提取规则**：
- **系统行为**（什么是系统做的） → 提取为 SHALL 条目
- **业务约束**（必须遵守的限制） → 提取为 MUST 条目
- **用户可见行为**（API 响应格式、错误码） → 提取为 SHOULD 条目
- **实现细节**（内部变量名、helper 函数） → 不提取

**AUTO-EXTRACTED 标记**：
每个自动提取的条目在末尾添加：
\`\`\`
# AUTO-EXTRACTED from <change-name> on <timestamp>
# Source: <file>:<line>
\`\`\`

标记的目的是：
- 标识是工具自动生成的，不是人工编写的
- 便于后续人工 review 时定位和验证
- 在后续归档中，如果人工 review 确认正确，移除 \`AUTO-EXTRACTED\` 标记

### 4. 最终检查

- [ ] 所有 delta-specs 已合并或标记冲突
- [ ] 已扫描代码 diff 并提取认知
- [ ] 提取的条目有 \`AUTO-EXTRACTED\` 标记
- [ ] 全局 specs/ 文件无格式损坏
- [ ] change 目录保留为历史记录（不删除）

## 产物

- \`specs/<domain>/spec.md\`（更新） — 合并后的全局规范
- \`specs/<domain>/spec.md\`（追加） — 代码认知提取后的新增条目

## 验证

- [ ] delta-specs 已正确合并到全局 specs/
- [ ] 冲突已标记 \`[CONFLICT: <change>]\` 且列出双方
- [ ] 代码提取条目有 \`AUTO-EXTRACTED\` 标记
- [ ] 全局 specs/ 可被 parseSpec 读取（无格式错误）
- [ ] change 目录保留

## 常见陷阱

- 不要删除 change 目录 — 它是 git 历史之外的辅助审计轨迹
- 不要覆盖全局 specs/ — 只追加、替换对应 ID、或标记删除
- 代码提取不是 code review — 提取行为契约，不是判断代码好坏
- 提取要克制 — 只有「系统行为/约束」才提取，「实现方式」不提取
- AUTO-EXTRACTED 条目需要人肉 review 确认，不是最终版
- 如果一个 extract 发现的行为明确违反现有 specs/ 或 conventions/，额外标记 \`[FLAG: conflict with <existing-spec-ref>]\`

## 参考

- OpenSpec 的 delta-merge 流程
- Trellis 的代码认知回灌概念（仅参考）
- GSD Core 的 archive 阶段