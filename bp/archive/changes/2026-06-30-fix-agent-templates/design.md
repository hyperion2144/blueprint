# Design: fix-agent-templates

---

## 背景与目标

所有 agent 输出文档需有 fillable 模板。新增 2 个 agent。所有 agent 说明中标注模板获取方式。

## 修改文件清单

| 文件 | 操作 |
|------|------|
| `src/public/templates/codebase/stack.md` | 创建（模板） |
| `src/public/templates/codebase/architecture.md` | 创建（模板） |
| `src/public/templates/codebase/conventions.md` | 创建（模板） |
| `src/public/templates/codebase/pitfalls.md` | 创建（模板） |
| `src/public/templates/specs/spec.md` | 创建（模板） |
| `src/public/templates/agents/codebase-mapper.md` | 创建（agent 定义） |
| `src/public/templates/agents/spec-bootstrapper.md` | 创建（agent 定义） |
| `src/public/templates/agents/researcher.md` | 修改（产物要求加模板引用） |
| `src/public/templates/agents/planner.md` | 修改（产物要求加模板引用） |
| `src/public/templates/agents/executor.md` | 修改（产物要求加模板引用） |
| `src/public/templates/agents/reviewer.md` | 修改（产物要求加模板引用） |
| `src/public/templates/agents/verifier.md` | 修改（产物要求加模板引用） |
| `src/public/templates/agents/archiver.md` | 修改（产物要求加模板引用） |
| `src/commands/blueprint-template.ts` | 修改（注册新模板类型） |
| `src/generators/omp-agents.ts` | 修改（AGENT_DEFS 加 2 个） |

## 模板获取机制

agent 通过以下方式获取模板内容：
```
blueprint template <type>
```

输出到 stdout，子代理 pipe 到文件后填充。
