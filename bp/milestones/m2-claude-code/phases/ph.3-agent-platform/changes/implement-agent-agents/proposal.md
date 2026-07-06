# Proposal: implement-agent-agents

**Intent**: 为 `.agent/` 平台生成 agent 文件，通用 frontmatter。
**Scope**: src/integrations/agent/agents.ts + index.ts — 7 agent 文件 + provider 注册
**Must-haves**:
1. SHALL `platform: [agent]` 时生成 `.agent/agents/bp-<role>.md`
2. SHALL frontmatter 不含 OMP 特定字段
3. SHALL `registerAgentProvider()` 在 generators/index.ts 注册
4. SHALL golden-file 测试
