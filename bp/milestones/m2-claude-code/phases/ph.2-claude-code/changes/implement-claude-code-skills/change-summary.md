# Change Summary: implement-claude-code-skills

## Intent
为 Claude Code 平台生成 skill 文件（.claude/skills/bp-<step>.md）。

## Files Created
- `src/integrations/claude-code/skills.ts` — 22 skill file generator
- `src/integrations/claude-code/skills.test.ts` — 3 tests (golden-file snapshot)

## Verification
- 3 tests, all passed
- Golden-file snapshot created

## Must-haves Status
| Must-have | Status |
|-----------|--------|
| platform: [claude-code] 生成 .claude/skills/* | ✅ |
| Frontmatter 格式正确 | ✅ |
| Body 与 WORKFLOW_REGISTRY 一致 | ✅ |
| $1/$ARGUMENTS 保持原样 | ✅ |
| Golden-file 测试 | ✅ |
