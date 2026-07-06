# Proposal: implement-agent-skills

**Intent**: 为 `.agent/` 平台生成 skill 文件，参数使用 `[BP:xxx]` 格式。
**Scope**: src/integrations/agent/skills.ts — 22 skill 文件，`$1`→`[BP:CHANGE_NAME]` 替换
**Must-haves**:
1. SHALL `platform: [agent]` 时生成 `.agent/skills/bp-<step>/SKILL.md`
2. SHALL 参数为 `[BP:CHANGE_NAME]`/`[BP:MILESTONE_ID]` 格式
3. SHALL golden-file 测试
