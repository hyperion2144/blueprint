# 自动推进工作流指引

## 概述

读取 STATE.md，由状态机确定当前状态，自动触发对应的下一个 slash command。

Continue 是整个工作流的自动导航器。它不执行任何业务逻辑，只负责判断「现在该做什么」并触发。

## 前置条件

- specwf/STATE.md 存在且格式正确
- specwf 已初始化

## 执行步骤

### 1. 读取 STATE.md

\`\`\`
specwf state
\`\`\`

STATE.md 包含：
- 当前 milestone / phase / change 的位置
- 各个实体的状态
- 下一步提示（如果有）

### 2. 状态机匹配

根据 STATE.md 数据，匹配状态转换规则：

\`\`\`
# 状态转换规则

无 phase → /specwf:roadmap
phase 已定，无 context.md → /specwf:discuss
context.md 存在，无 change → /specwf:split
change 已拆分，无 proposal.md → /specwf:plan
plan 完成，未 apply → /specwf:apply
apply 完成，未 review → /specwf:review
review 完成，未 verify → /specwf:verify
verify passed，未 archive → /specwf:archive
archive 完成，未 ship → /specwf:ship
ship 完成，还有 phase → 看 state 的下一步提示
ship 完成，本 milestone 完成 → /specwf:ship（milestone 级）
全部完成 → 提示完成
\`\`\`

### 3. 输出下一步

输出格式：
\`\`\`
# Continue 结果

## 当前状态
- Project: <name>
- Milestone: <ms-name>（<status>）
- Phase: <ph-name>（<status>）
- Change: <change-name>（<status>）

## 下一步
- 命令: /specwf:<next-step>
- 前置条件: ...
\`\`\`

### 4. 触发（可选）

如果配置了 \`auto_advance: true\`，自动加载对应的 skill 并开始执行。

## 产物

- （无永久文件输出）
- 控制台输出下一步建议（或自动触发）

## 验证

- [ ] 正确识别当前状态
- [ ] 正确匹配下一步
- [ ] STATE.md 格式可解析
- [ ] 无状态机死循环风险

## 常见陷阱

- 如果 STATE.md 内容不完整或格式损坏，不要猜测 — 提示用户运行 \`specwf init\` 或手动修复
- 如果多个 change 存在且状态不一致，优先处理最深的未完成 change
- 不要自动推进跳过 review → verify → archive 的流程（review 必须由用户触发来确认质量）
- auto_advance 模式不跳过 review — 只是自动触发 review 命令，仍需要 reviewer agent

## 参考

- state-machine 模块的状态转换表
- OMP 的 continue 命令设计