# Tasks: fix-agent-templates

---

## Wave 1: 模板文件

- [ ] task-1: 创建 codebase/stack.md 模板（技术栈）
- [ ] task-2: 创建 codebase/architecture.md 模板（架构）
- [ ] task-3: 创建 codebase/conventions.md 模板（代码规范）
- [ ] task-4: 创建 codebase/pitfalls.md 模板（陷阱风险）
- [ ] task-5: 创建 specs/spec.md 模板（BOOTSTRAPPED 规格）

## Wave 2: Agent 定义

- [ ] task-6: 创建 codebase-mapper agent 定义
- [ ] task-7: 创建 spec-bootstrapper agent 定义
- [ ] task-8: 更新 6 个已有 agent 的产物要求加模板引用
- [ ] task-9: 更新 omp-agents.ts 的 AGENT_DEFS 加 2 个
- [ ] task-10: 更新 blueprint-template.ts 注册新模板类型

## 验证

- [ ] vitest run 通过
- [ ] `blueprint template codebase-stack` 输出模板
- [ ] `blueprint template spec-bootstrap` 输出模板
- [ ] `blueprint update` 生成新 agent 文件
