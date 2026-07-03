# Verification: fix-agent-templates

> 验证时间: 2026-06-29

## 测试结果

| 测试 | 类型 | 结果 | 耗时 |
|------|------|------|------|
| vitest run | unit + integration | ✅ 通过 | 1.2s (79/79) |
| npm run build | build | ✅ 通过 | 10ms (76KB) |

## 手工验证

| 测试 | 结果 |
|------|------|
| .omp/agents/ 有 8 个 agent | ✅ |
| blueprint template codebase-stack 可用 | ✅ |
| blueprint template codebase-architecture 可用 | ✅ |
| blueprint template codebase-conventions 可用 | ✅ |
| blueprint template codebase-pitfalls 可用 | ✅ |
| blueprint template spec-bootstrap 可用 | ✅ |
| blueprint update 生成 40 个文件 | ✅ |
| 新 agent 模版文件存在 | ✅ |

## 文件清单

### 新模板
- `templates/codebase/stack.md` — codebase-mapper 输出
- `templates/codebase/architecture.md` — codebase-mapper 输出
- `templates/codebase/conventions.md` — codebase-mapper 输出
- `templates/codebase/pitfalls.md` — codebase-mapper 输出
- `templates/specs/spec.md` — spec-bootstrapper 输出

### 新 agent
- `agents/codebase-mapper.md` — 代码库映射
- `agents/spec-bootstrapper.md` — 规格启动

### 更新
- 6 个已有 agent 的产物要求加模板引用
- omp-agents.ts: AGENT_DEFS +2, thinkingLevel +2
- blueprint-template.ts: 支持 codebase/specs 模板
- 测试: e2e.test.ts agent 计数 6→8
