# specwf — 规格驱动开发工作流

## 是什么

specwf 是一个独立 TypeScript CLI 包，为 AI 编码 agent 提供规格驱动的开发工作流。它融合三个项目的核心能力：

- **OpenSpec**（MIT）— CLI 架构、change 结构、delta-spec 合并机制
- **GSD Core**（MIT）— milestone/phase 层级、fresh-context 子代理并行执行
- **Trellis**（AGPL-3.0，仅参考概念）— spec 自动注入、代码认知回灌

## 为什么

AI 编码 agent 强大但不可预测——需求只存在于聊天历史中。specwf 在写代码前对齐规格，在 fresh-context 子代理中执行重活，通过结构化产物让状态跨会话持久化。

## 核心理念

1. **双循环嵌套** — Phase 循环（discuss→research→split→change循环→ship）⊃ Change 循环（plan→apply→review→verify→archive）
2. **CLI 为唯一事实源** — 所有交互通过 CLI，agent 只做编排
3. **fresh-context 子代理** — 重活（research/apply/review）在 fresh context 中执行，防止 context rot
4. **spec 双重回灌** — delta-spec 前瞻合并 + 代码认知回顾提取
5. **TDD 强制** — type:behavior 走 RED→GREEN→REFACTOR

## 实体层级

```
Project → Milestone（恒存，默认 v1）→ Phase → Change
```

- **Milestone** = 版本周期（可发布增量）
- **Phase** = 工作单元（走 discuss/research/split/ship）
- **Change** = 变更单元（走 plan/apply/review/verify/archive）

## 技术栈

- 语言: TypeScript
- 运行时: Node.js ≥ 20
- 测试: Vitest
- 目标平台: OMP（优先）、Claude Code（后续）

## 版本

- **当前版本**: v0.2.0（v1 修复）
- **下一个**: m2-claude-code — Claude Code 平台支持

## 状态

- [x] grill — 需求探讨完成（21 项决策确认）
- [x] research — 技术调研完成
- [x] roadmap — 路线图拆分完成
- [x] Phase 1 — 实现核心 CLI（m1-core v0.1.0 已发布）
- [x] v1 修复 — 审计发现的全部问题已修复（v0.2.0 已发布）

详见 [state.md](state.md)。
