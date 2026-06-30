# 自动推进工作流指引

## 概述

读取 state.md，由状态机确定当前状态，自动触发对应的下一个 slash command。

Continue 是整个工作流的自动导航器。它不执行任何业务逻辑，只负责判断「现在该做什么」并触发。

## 前置条件

- specwf/state.md 存在且格式正确
- specwf 已初始化

## 执行步骤

### 1. 读取 state.md

\`\`\`
specwf state
\`\`\`

state.md 包含：
- 当前 milestone / phase / change 的位置
- 各个实体的状态
- 下一步提示（如果有）

### 2. 查询特定 change 的状态

\`\`\`
specwf continue change <name>
\`\`\`

查询指定 change 或临时 change 的当前状态和下一步建议。

### 3. 状态机匹配

根据 state.md 数据，状态引擎自动匹配合法转移。每个步骤对应一个 slash command：

| 层级 | 当前步骤 | 下一步命令 | 子代理 |
|------|---------|-----------|--------|
| 项目层 | initialized | /specwf:grill | — |
| 项目层 | requirements-defined | /specwf:research | researcher |
| 项目层 | researched | /specwf:roadmap | — |
| 项目层 | roadmap-defined | /specwf:discuss | — |
| Phase | phase-discuss | /specwf:research-phase | researcher |
| Phase | phase-research | /specwf:split | — |
| Phase | phase-split 后 | /specwf:plan → apply → review → verify → archive | 各步对应 subagent |
| Phase | change-archived | /specwf:ship | — |
| Phase | phase-shipped | /specwf:ship（milestone）或 /specwf:discuss（下一 phase）| — |
| 临时 change | adhoc-proposal | /specwf:plan | planner |

完整的状态转移表见 `src/types/state.ts`。

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
- [ ] state.md 格式可解析
- [ ] 无状态机死循环风险

## 常见陷阱

- 如果 state.md 内容不完整或格式损坏，不要猜测 — 提示用户运行 \`specwf init\` 或手动修复
- 如果多个 change 存在且状态不一致，优先处理最深的未完成 change
- 不要自动推进跳过 review → verify → archive 的流程（review 必须由用户触发来确认质量）
- auto_advance 模式不跳过 review — 只是自动触发 review 命令，仍需要 reviewer agent

## 参考

- state-machine 模块的状态转换表
- OMP 的 continue 命令设计