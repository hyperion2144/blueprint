# Change Summary: implement-agent-generator

## 描述

OMP agent 生成器（6 个 agent 模板 + 模型映射 + 生成函数）

## 产出文件

- `src/generators/omp-agents.ts`
- `src/public/templates/agents/*.md (6 个)`

## 验证

- [x] tsc --noEmit 通过
- [x] vitest run 通过
