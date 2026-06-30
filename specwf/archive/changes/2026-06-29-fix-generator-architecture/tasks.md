# Tasks: 修复生成器架构 + 产物模板体系

## 1. 模板文件 — 命令（14 个）
- [ ] 1.1 创建 src/templates/commands/ 下 14 个 .md 模板文件
  - 每个包含完整 7 章节工作流指引（角色/前置/步骤/子代理/产物/验证/下一步）
  - 用 {{step}} {{description}} 占位符

## 2. 模板文件 — Agent（6 个）
- [ ] 2.1 创建 src/templates/agents/ 下 6 个 .md 模板文件
  - 每个包含完整 6 章节 systemPrompt（角色/约束/流程/偏差/产物/验证）
  - 用 {{role}} {{description}} {{model}} 占位符

## 3. 模板文件 — Skill（14 个）
- [ ] 3.1 创建 src/templates/skills/ 下 14 个 .md 模板文件
  - 每个包含完整 6 章节（概述/前置/步骤/产物/验证/陷阱）
  - 用 {{step}} {{description}} 占位符

## 4. 模板文件 — 产物（12 个）
- [ ] 4.1 创建 src/templates/artifacts/ 下 12 个 .md/.yml 模板文件
  - proposal/design/tasks/context/research/summary
  - verification/spec-review/quality-review/goal-review
  - project.yml/state.md

## 5. 重写生成器代码（4 个文件）
- [ ] 5.1 src/generators/omp-commands.ts — 读模板 + 替换变量 + 生成 frontmatter
- [ ] 5.2 src/generators/omp-agents.ts — 读模板 + 替换变量 + 生成 frontmatter
- [ ] 5.3 src/generators/skills.ts — 读模板 + 替换变量 + 生成 frontmatter
- [ ] 5.4 src/generators/index.ts — 调度三个生成器

## 6. 更新 template 命令
- [ ] 6.1 src/commands/specwf-template.ts — 从 src/templates/artifacts/ 读取模板

## 7. 更新 tsup 配置
- [ ] 7.1 tsup.config.ts — publicDir 复制模板到 dist/

## 8. 验证
- [ ] 8.1 tsc --noEmit 通过
- [ ] 8.2 vitest run 通过
- [ ] 8.3 specwf update 生成文件 — 格式遵循 OMP 文档规范
- [ ] 8.4 specwf template proposal — 从模板文件生成
- [ ] 8.5 生成器代码总行数 < 300
