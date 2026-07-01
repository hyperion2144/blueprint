# Phase 4 Summary: 平台生成器

## 完成状态

✅ Phase 4 shipped。3 个 change 全部归档。

## Change 产出明细

### change: implement-command-generator
- **描述**: OMP 命令生成器（14 个 slash command 模板 + 生成函数）
- **产出文件**:
  - `src/generators/omp-commands.ts` — STEP_DEFS 定义 + generateSlashCommand + generateAllCommands（读模板文件 + 替换 {{step}}/{{description}}）
  - `src/public/templates/commands/init.md` — init 命令模板（7 章节工作流指引）
  - `src/public/templates/commands/grill.md` — grill 命令模板
  - `src/public/templates/commands/research.md` — research 命令模板
  - `src/public/templates/commands/roadmap.md` — roadmap 命令模板
  - `src/public/templates/commands/discuss.md` — discuss 命令模板
  - `src/public/templates/commands/research-phase.md` — research-phase 命令模板
  - `src/public/templates/commands/split.md` — split 命令模板
  - `src/public/templates/commands/plan.md` — plan 命令模板（含 TDD 协议 + plan-checker 验证）
  - `src/public/templates/commands/apply.md` — apply 命令模板（含 TDD 执行 + 分组并发）
  - `src/public/templates/commands/review.md` — review 命令模板（含三重并行 + 门控）
  - `src/public/templates/commands/verify.md` — verify 命令模板（含回环路由）
  - `src/public/templates/commands/archive.md` — archive 命令模板（含 delta 合并 + 代码提取）
  - `src/public/templates/commands/ship.md` — ship 命令模板
  - `src/public/templates/commands/continue.md` — continue 命令模板
- **验证**: specwf update 生成 14 个 .omp/commands/specwf-*.md，frontmatter 格式合规

### change: implement-agent-generator
- **描述**: OMP agent 生成器（6 个 agent 模板 + 模型映射 + 生成函数）
- **产出文件**:
  - `src/generators/omp-agents.ts` — AGENT_DEFS 定义 + resolveAgentModel + generateAgent + generateAllAgents（读模板文件 + 替换 {{role}}/{{description}}/{{model}}）
  - `src/public/templates/agents/researcher.md` — researcher systemPrompt（6 章节：角色/约束/流程/偏差/产物/验证）
  - `src/public/templates/agents/planner.md` — planner systemPrompt（含 TDD 标注规则 + scope_reduction_prohibition）
  - `src/public/templates/agents/executor.md` — executor systemPrompt（含 4 条偏差规则 + 分析瘫痪防护）
  - `src/public/templates/agents/reviewer.md` — reviewer systemPrompt（含三重审查内容 + 门控规则）
  - `src/public/templates/agents/verifier.md` — verifier systemPrompt（含回环路由规则）
  - `src/public/templates/agents/archiver.md` — archiver systemPrompt（含双重回灌 + AUTO-EXTRACTED 标记）
- **验证**: specwf update 生成 6 个 .omp/agents/specwf-*.md，frontmatter 含 name/description/tools/model/spawns

### change: implement-skill-generator
- **描述**: Skill 生成器（14 个 skill 模板 + 生成函数）
- **产出文件**:
  - `src/generators/skills.ts` — SkillDef 定义 + generateSkill + generateAllSkills（读模板文件 + 替换 {{step}}/{{description}}）
  - `src/public/templates/skills/init.md` — init skill（6 章节：概述/前置/步骤/产物/验证/陷阱）
  - `src/public/templates/skills/grill.md` ~ `src/public/templates/skills/continue.md` — 其余 13 个 skill 模板
- **验证**: specwf update 生成 14 个 skills/specwf-*/SKILL.md，frontmatter 含 name/description

## 验证结果

| 验证项 | 结果 | 证据 |
|---|---|---|
| tsc --noEmit | ✅ | 0 errors |
| vitest run | ✅ | 65/65 通过 |
| specwf update | ✅ | 生成 34 个平台文件（14 commands + 6 agents + 14 skills） |
| 命令 frontmatter | ✅ | name + description（OMP native 级别 fatal parse） |
| agent frontmatter | ✅ | name + description + tools + model + spawns |
| skill frontmatter | ✅ | name + description（OMP native requireDescription） |
| 模板文件化 | ✅ | 生成器 390 行，模板内容全在 .md 文件里 |
