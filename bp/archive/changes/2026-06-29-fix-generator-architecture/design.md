# Design: 修复生成器架构 + 产物模板体系

## 问题

1. 模板文本硬编码在 .ts 代码里（4516 行），应该用模板文件
2. agent/command/skill 格式不严格遵循 OMP 文档规范
3. 步骤产出 md 文件（proposal/design/tasks/context/summary 等）缺少固定模板

## 修复方案

### 1. 模板文件架构

```
src/templates/
├── commands/              14 个命令模板（body 部分，不含 frontmatter）
│   ├── init.md
│   ├── grill.md
│   ├── ...
│   └── continue.md
├── agents/                6 个 agent 模板（systemPrompt 部分，不含 frontmatter）
│   ├── researcher.md
│   ├── planner.md
│   ├── executor.md
│   ├── reviewer.md
│   ├── verifier.md
│   └── archiver.md
├── skills/                14 个 skill 模板（body 部分，不含 frontmatter）
│   ├── init.md
│   ├── ...
│   └── continue.md
└── artifacts/             步骤产出 md 模板
    ├── proposal.md        change proposal 模板
    ├── design.md          change design 模板
    ├── tasks.md           change tasks 模板
    ├── context.md         phase context 模板
    ├── research.md        phase research 模板
    ├── summary.md         phase summary 模板
    ├── verification.md    verification 报告模板
    ├── spec-review.md     规格审查模板
    ├── quality-review.md  质量审查模板
    ├── goal-review.md     目标审查模板
    ├── project.yml        新项目配置模板
    └── state.md           初始 state 模板
```

### 2. OMP 格式规范（严格遵循 OMP 文档）

#### Slash Command 格式（OMP slash-command-internals.md）

```markdown
---
name: specwf:<step>
description: <一句话描述>
---

<body — prompt 模板，支持 $1 $ARGUMENTS 参数替换>
```

- 文件路径：`.omp/commands/specwf-<step>.md`
- frontmatter：`name` + `description`（native 级别 parse 错误是 fatal）
- body：prompt 模板，支持 `$1`/`$2`/`$ARGUMENTS`/`$@` 占位符
- 非递归扫描 `*.md`

#### Agent 格式（OMP task-agent-discovery.md）

```markdown
---
name: specwf-<role>
description: <角色描述>
tools:
  - read
  - write
  - ...
model: <OMP modelRole: slow/default/smol>
thinkingLevel: <high/medium/low/off>
spawns: "*"
---

<systemPrompt — agent 系统提示>
```

- 文件路径：`.omp/agents/specwf-<role>.md`
- frontmatter 必填：`name` + `description`
- frontmatter 可选：`tools`(CSV/array, yield 自动追加) / `model` / `thinkingLevel` / `spawns` / `output` / `blocking` / `autoloadSkills` / `readSummarize`
- `spawns` 缺省但 `tools` 含 `task` 时自动 `*`
- first-wins 去重（project > user > plugin > bundled）

#### Skill 格式（OMP skills.md）

```markdown
---
name: specwf-<step>
description: <一句话描述>
---

<skill body — 工作流指引文档>
```

- 目录路径：`skills/specwf-<step>/SKILL.md`（一级目录，非递归）
- frontmatter：`name`（默认目录名）+ `description`（native 级别必填）
- 可选：`globs` / `alwaysApply` / `hide` / `disableModelInvocation`
- 模型通过 `read skill://specwf-<step>` 按需加载
- `/skill:specwf-<step>` 可交互触发

### 3. 生成器代码架构（~50 行/文件）

生成器代码只负责：
1. 读取模板文件（readFileSync）
2. 替换 `{{变量}}` 占位符
3. 生成 frontmatter（动态，不在模板里）
4. 拼接 frontmatter + body
5. 输出文件路径 + 内容

### 4. 产物模板体系

`specwf template <type>` 命令从 `src/templates/artifacts/` 读取模板文件，写入目标目录。

支持的模板类型：
- `proposal` — change proposal
- `design` — change design
- `tasks` — change tasks（含 TDD type 标注说明）
- `context` — phase context
- `research` — phase research
- `summary` — phase summary
- `verification` — verification 报告
- `spec-review` — 规格审查
- `quality-review` — 质量审查
- `goal-review` — 目标审查

### 5. tsup 配置

tsup 需要把 `src/templates/` 目录复制到 `dist/templates/`，因为生成器运行时需要读取模板文件。

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  banner: { js: '#!/usr/bin/env node' },
  target: 'es2022',
  publicDir: 'src/templates',  // 复制到 dist/
});
```

## 验证标准

1. tsc --noEmit 通过
2. vitest run 通过
3. `specwf update` 生成的命令/agent/skill 文件格式严格遵循 OMP 文档规范
4. `specwf template proposal` 生成的文件内容来自模板文件，不是代码里拼的
5. 生成器代码总行数 < 300（模板内容全在 .md 文件里）
6. 每个 change 都有独立的 plan → apply → review → verify → archive
