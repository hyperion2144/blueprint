# OMP 集成层调研 — 命令/Agent/Skill 生成与 Context 注入

## 概述

blueprint 的三层架构（CLI + Slash Commands + Skills + 子代理 Agent）需要在 `blueprint update` 时生
成 OMP 平台文件。本文档覆盖：

- `.omp/commands/*.md`（slash command）的格式规范和生成方案
- `.omp/agents/*.md`（task 子代理）的格式规范和生成方案
- `skills/<name>/SKILL.md`（工作流指引）的格式规范和生成方案
- `blueprint context <step>` 上下文注入机制设计
- 集成陷阱和注意事项

---

## 一、Slash Command 文件：`.omp/commands/blueprint-<step>.md`

### 1.1 OMP 发现机制

```
搜索路径：
  1. <cwd>/.omp/commands/*.md     ← 项目级（native, priority 100）
  2. ~/.omp/agent/commands/*.md   ← 用户级（native, priority 100）

行为：
  - 非递归扫描，只认 `*.md`
  - 前件（frontmatter）中 `name` 覆盖文件名
  - 同名列优先 1 > 2（项目覆盖用户）
  - 前件解析失败：native 级别视为 fatal，其他 warn+fallback
```

### 1.2 Frontmatter 格式

```yaml
---
name: blueprint:plan          # 覆盖文件名，即 /blueprint:plan
description: 执行 Change 设计工作流（plan→apply→review→verify→archive）
---
```

### 1.3 Body 参数替换

OMP 支持：

| 占位符 | 说明 |
|---|---|
| `$1`, `$2`, ... | 位置参数，quote-aware 分割 |
| `$@[start]` / `$@[start:length]` | 切片引用，1-based |
| `$ARGUMENTS` / `$@` | 全部参数（原始字符串） |
| `{{args}}`, `{{ARGUMENTS}}` | prompt.render 模板变量 |

不支持的：
- 反斜杠转义（unmatched quote 不是错误，吞噬到尾）
- 位置参数数量校验

### 1.4 生成方案

每个 slash command 对应一个步骤。从 requirements.md 的 slash 命令表生成。

**模板引擎设计**（CLI 实现 `blueprint update` 时内置）：

```
generators/slash-commands.ts
├── defineCommand(name, step, { usesAgent, description, body }) → frontmatter + body
├── bodyTemplate(step) → 步骤特定的 prompt 模板
└── generateAll(config, steps) → { path, content }[]
```

**slug 命名规则**：`blueprint-<step>.md`，其中 `step` 为 `plan`、`review` 等。frontmatter
中 `name: blueprint:<step>` 覆盖文件名。

**步骤体模板结构**（以 plan 为例）：

```markdown
---
name: blueprint:plan
description: 执行 Change 设计工作流
---

# 工作流: Change 设计 (plan)

## 1. 读取上下文
- 运行 `blueprint context plan` 获取上下文清单
- 按清单逐个 `read` 文件

## 2. 读取 Skill 指引（可选）
- 用 `read skill://blueprint-plan` 获取工作流详细指引

## 3. 执行步骤
- （子代理 fan-out 等高成本操作）
- 每步通过 bash 调用 `blueprint` CLI 管理产物/状态

## 4. 使用子代理（如需要）
- 用 `task` 工具 fan-out: researcher / planner / executor / ...
- 工具集和模型角色由 agent 定义文件自动配置
```

**所有 slash command 的通用 body 结构**：

```
1. 读取上下文（blueprint context <step>）
2. 读取 skill 指引（read skill://blueprint-<step>）
3. 执行工作流核心逻辑
4. 使用 task 工具 fan-out 子代理
5. 通过 bash 调用 blueprint CLI 管理产物/状态
```

### 1.5 步骤清单（13 个命令）

| 文件名 | 步骤 | 子代理 |
|---|---|---|
| `blueprint-init.md` | init | research (codebase+spec 并行) |
| `blueprint-grill.md` | grill | - |
| `blueprint-research.md` | research | 并行多方向 |
| `blueprint-roadmap.md` | roadmap | - |
| `blueprint-discuss.md` | discuss | - |
| `blueprint-research-phase.md` | research-phase | 并行 |
| `blueprint-split.md` | split | - |
| `blueprint-plan.md` | plan | 可并行 |
| `blueprint-apply.md` | apply | 分组并发 |
| `blueprint-review.md` | review | 三重并行 |
| `blueprint-verify.md` | verify | 可并行 |
| `blueprint-archive.md` | archive | - |
| `blueprint-ship.md` | ship | - |
| `blueprint-continue.md` | continue | - |

**`blueprint-continue.md` 特殊处理**：body 是"读 state.md → 状态机确定下一步 → 对应 slash command"
不需要子代理。

### 1.6 完整模板示例

**`blueprint-plan.md`**：

```markdown
---
name: blueprint:plan
description: 执行 Change 设计：需求分析→方案设计→任务拆分→delta-spec 预写
---

# 工作流: Change 设计 (plan)

## 1. 获取上下文
运行以下命令获取当前 Change 的完整上下文：
\`\`\`
blueprint context plan $1
\`\`\`

按输出的文件路径清单逐个读取。

## 2. 读取工作流指引
用 `read skill://blueprint-plan` 获取详细设计流程指引。

## 3. 执行设计
1. 分析 proposal.md 了解变更需求
2. 查阅相关 specs/ 和 conventions/
3. 设计技术方案 → design.md
4. 拆分为实现任务 → tasks.md（标注 type:behavior / config / refactor / docs / scaffolding）
5. 预写 delta-specs → specs/<domain>/spec.md

## 4. 验证
- type:behavior 任务必须标注 TDD 协议（RED→GREEN→REFACTOR）
- 确认 tasks.md 覆盖 proposal.md 所有需求

## 5. 产物管理
通过 bash 调用 blueprint CLI：
- 状态管理：\`blueprint state\`
- 文件模板：\`blueprint template design\`

## 6. 子代理
需要时用 \`task\` 工具 fan-out 子代理（如复杂场景的多方案设计比较）。
```

### 1.7 生成代码架构

```typescript
// src/generators/slash-commands.ts

interface CommandDef {
  step: string;
  name: string;
  description: string;
  usesAgent: boolean;
  agents: string[];
  /** 自定义 body 覆盖默认模板 */
  bodyOverride?: string;
}

function generateSlashCommand(def: CommandDef): string {
  return `---
name: ${def.name}
description: ${def.description}
---

${def.bodyOverride ?? defaultBody(def)}
`;
}

function defaultBody(def: CommandDef): string {
  return `# 工作流: ${def.description}

## 1. 获取上下文
\`\`\`
blueprint context ${def.step} $1
\`\`\`

## 2. 读取工作流指引
用 \`read skill://blueprint-${def.step}\` 获取详细指引。

## 3. 执行工作流
${stepSpecificBody(def.step)}

## 4. 产物管理
通过 \`bash\` 调用 blueprint CLI 管理产物和状态。

${def.usesAgent ? `## 5. 子代理
核心工作通过 \`task\` 工具 fan-out 子代理：
${def.agents.map(a => `- \`${a}\``).join('\n')}` : ''}
`;
}
```

---

## 二、Agent 文件：`.omp/agents/blueprint-<role>.md`

### 2.1 OMP 发现机制

```
搜索路径（按优先级）:
  1. <cwd>/.omp/agents/        ← 项目级（最高优先）
  2. ~/.omp/agent/agents/      ← 用户级
  3. plugin agents/ dirs       ← 插件
  4. bundled agents            ← 内建

冲突：first-wins by exact name（大小写敏感）
```

### 2.2 Frontmatter 格式

```yaml
---
name: blueprint-researcher
description: 技术调研：产出 STACK/ARCH/PITFALLS/RESEARCH 文档
tools:
  - read
  - grep
  - glob
  - lsp
  - web_search
  - write
  - bash
model: slow               # OMP modelRole: slow / default / smol
thinkingLevel: high       # high / medium / low / off / minimal / xhigh
spawns:
output:                   # 可选，结构化输出 schema
blocking: false
autoloadSkills: false
readSummarize: true       # 默认 true，false 时 read 返回原文字
---
```

### 2.3 关键字段说明

| 字段 | OMP 行为 | blueprint 策略 |
|---|---|---|
| `name` | required，必须唯一 | `blueprint-<role>`（researcher/planner/executor/reviewer/verifier/archiver） |
| `description` | required | 从 project.yml/proposal 自动生成 |
| `tools` | CSV 或 YAML 数组，`yield` 自动追加 | 每个角色预设工具集 |
| `model` | modelRole: slow/default/smol 或 provider/modelId | 从 profile + project.yml models 映射 |
| `thinkingLevel` | off/minimal/low/medium/high/xhigh | 从 profile 映射 |
| `spawns` | `*`=any, CSV, or array; 缺省且 tools 含 `task` 则自动 `*` | 默认 `*`（executor/verifier 可能需要限制） |
| `output` | 传透给 task 工具作为 schema | 不需要时省略 |
| `blocking` | 缺省 false，应用在 session 中选择 | 全部 false |
| `autoloadSkills` | 缺省 false | 全部 false（按需 read skill://） |
| `readSummarize` | 缺省 true | 全部 true（除非 agent 需要逐字文件名） |

### 2.4 Model 映射方案

project.yml 的 `models` 字段覆盖 profile 默认值：

```yaml
# project.yml 默认值（standard profile）
# research → slow, plan → slow, execute → default
# review → slow, verify → default, archive → default
models:
  researcher: slow:high      # modelRole + thinkingLevel
  planner: slow:high
  executor: default:medium
  reviewer: slow:high
  verifier: default:medium
  archiver: smol
```

**映射规则**：

1. 用 profile（lite/standard/strict）确定每个角色的默认 modelRole + thinkingLevel
2. project.yml `models` 中的覆盖优先（格式 `modelRole:thinkingLevel` 或 `provider/modelId`）
3. 生成 agent 文件时，`model` 字段写入 role 名（如 `slow`），不硬编码具体模型
4. 如果 project.yml 指定了具体 `provider/modelId`（如 `anthropic/claude-sonnet-4-5`），
   则直接写入

**OMP 中的 model 字段支持**：
- modelRole 引用：`slow`、`default`、`smol`、`vision`、`plan`、`designer`、`commit`、
  `tiny`、`task`、`advisor`
- 具体模型：`provider/modelId`（如 `anthropic/claude-opus-4-5`）
- thinkingLevel 后缀：在 model 字段后追加，如 `slow:high`

```yaml
# 三种合法写法
model: slow                # role 引用
model: slow:medium         # role + thinkingLevel
model: anthropic/claude-sonnet-4-5  # 显式指定（不推荐，降低可移植性）
```

### 2.5 六个 Agent 定义

#### blueprint-researcher

```yaml
---
name: blueprint-researcher
description: 技术调研：产出 STACK/ARCH/PITFALLS/RESEARCH 文档
tools:
  - read
  - grep
  - glob
  - lsp
  - web_search
  - write
  - bash
model: slow
thinkingLevel: high
spawns: "*"
readSummarize: true
---
```

#### blueprint-planner

```yaml
---
name: blueprint-planner
description: Change 设计：产出 proposal/design/tasks/delta-specs
tools:
  - read
  - grep
  - glob
  - lsp
  - write
  - bash
model: slow
thinkingLevel: high
spawns: "*"
blocking: false
---
```

#### blueprint-executor

```yaml
---
name: blueprint-executor
description: 代码实现：TDD RED→GREEN→REFACTOR
tools:
  - read
  - edit
  - write
  - bash
  - grep
  - glob
  - lsp
  - ast_grep
  - ast_edit
model: default
thinkingLevel: medium
spawns: "*"
---
```

#### blueprint-reviewer

```yaml
---
name: blueprint-reviewer
description: 三重审查：规格/质量/目标
tools:
  - read
  - grep
  - glob
  - lsp
  - ast_grep
  - bash
model: slow
thinkingLevel: high
spawns: "*"
---
```

#### blueprint-verifier

```yaml
---
name: blueprint-verifier
description: 测试验证：诊断+路由回环
tools:
  - read
  - bash
  - grep
  - glob
  - lsp
  - edit
  - write
model: default
thinkingLevel: medium
spawns: "*"
---
```

#### blueprint-archiver

```yaml
---
name: blueprint-archiver
description: 归档：delta 合并 + 代码认知回灌
tools:
  - read
  - grep
  - glob
  - write
  - bash
  - edit
model: default
thinkingLevel: medium
spawns: "*"
---
```

### 2.6 System Prompt 设计

Agent 文件 body 就是 systemPrompt。结构：

```markdown
你是一个 blueprint 的 ${role} 子代理。

## 核心约束
- 所有产物写入 blueprint/ 目录
- 通过 bash 调用 blueprint CLI 管理状态
- 遵守 project.yml 的 context 字段（项目上下文）
- 遵守 conventions/ 下的项目约定

## 输出要求
${outputRequirements}

## 步骤
${stepGuidance}
```

systemPrompt 中**不包含**具体项目上下文（那由 `blueprint context <step>` 输出）。Agent 通
过 slash command 的 prompt 模板获取「运行 blueprint context <step>」的指令。

### 2.7 生成方案

```typescript
// src/generators/agents.ts

interface AgentDef {
  role: string;
  description: string;
  tools: string[];
  modelRole: string;
  thinkingLevel: string;
  spawns: string;
  outputRequirements: string;
  stepGuidance: string;
}

function generateAgent(def: AgentDef): string {
  return `---
name: blueprint-${def.role}
description: ${def.description}
tools:
${def.tools.map(t => `  - ${t}`).join('\n')}
model: ${def.modelRole}
thinkingLevel: ${def.thinkingLevel}
spawns: "${def.spawns}"
---

你是一个 blueprint 的 **${def.role}** 子代理。

## 核心约束
- 所有产物写入 blueprint/ 目录
- 通过 bash 调用 blueprint CLI 管理状态和转换
- 遵守 project.yml 的 context 字段（注入到每步）
- 遵守 conventions/ 下的项目约定

## 输出要求
${def.outputRequirements}

## 步骤
${def.stepGuidance}
`;
}

// profile → model 角色映射表
const PROFILE_MODEL_MAP = {
  lite: {
    researcher: 'default',
    planner: 'default',
    executor: 'default',
    reviewer: 'default',
    verifier: 'default',
    archiver: 'smol',
  },
  standard: {
    researcher: 'slow',
    planner: 'slow',
    executor: 'default',
    reviewer: 'slow',
    verifier: 'default',
    archiver: 'default',
  },
  strict: {
    researcher: 'slow:high',
    planner: 'slow:high',
    executor: 'slow',
    reviewer: 'slow:high',
    verifier: 'slow',
    archiver: 'default',
  },
};

function resolveModelRole(
  role: string,
  profile: string,
  overrides: Record<string, string>,
): string {
  return overrides[role] ?? PROFILE_MODEL_MAP[profile][role];
}
```

### 2.8 生成时机

- `blueprint init` 时首次生成全部 6 个 agent 文件
- `blueprint update` 时重新生成（覆盖已有文件）
- 当 `project.yml` 的 `models` 或 `profile` 变更时也需要 update

---

## 三、Skill 文件：`skills/blueprint-<step>/SKILL.md`

### 3.1 OMP 发现机制

```
搜索路径（按优先级）:
  1. <ancestor>/.omp/skills/<name>/SKILL.md   ← 项目级（非递归）
  2. ~/.omp/agent/skills/<name>/SKILL.md       ← 用户级
  3. 插件 skills/ 目录
  4. Claude/Codex/agents 等外部技能路径

布局要求：
  skills/<skill-name>/SKILL.md           ← 必须一层
  skills/group/<skill>/SKILL.md          ← 不被发现（除非配置 customDirectories）

访问：
  - read skill://<name>                   → SKILL.md
  - read skill://<name>/<relative-path>   → 同目录下资源
  - /skill:<name> [args]                  → 交互式注入（Enter=steer, Ctrl+Enter=followUp）

冲突：first-wins by name（provider 优先级 native(100) > omp-plugins(90) > claude(80) > ...）
```

### 3.2 Frontmatter 格式

```yaml
---
name: blueprint-plan
description: Change 设计阶段工作流指引——需求分析到任务拆分
# 以下可选
globs: ["blueprint/changes/**/design.md"]
alwaysApply: false          # 是否每次都注入 skill 内容
hide: false                 # 是否在系统提示中列出
---
```

### 3.3 Body 设计

Skill body 是工作流指引文档，agent 通过 `read skill://<name>` 按需加载。内容结构：

```markdown
# blueprint-plan — Change 设计工作流指引

## 概述
${one-paragraph-summary}

## 前置条件
- milestone/phase 已 split：依赖图、requirements 已知
- 当前 change 的 proposal.md 已准备

## 输入
- ${inputFiles}

## 设计流程
### 1. ${step1-title}
${step1-details}

### 2. ${step2-title}
${step2-details}

...

## 输出产物
- **design.md**: 技术方案设计
- **tasks.md**: 实现清单（标注 type）
- **specs/<domain>/spec.md**: delta-specs（如需要）

## 检查清单
- [ ] proposal.md 全部需求在 tasks.md 中有对应
- [ ] type:behavior 任务标注 type/tasks/spec-level
- [ ] type:config/refactor/docs/scaffolding 标注跳过 TDD
- [ ] design.md 描述技术方案

## 常见陷阱
- ${pitfall1}
- ${pitfall2}

## 参考
- 子代理: blueprint-researcher / blueprint-planner
- 配置文件: \`blueprint context plan\`
```

### 3.4 Body 核心内容来源

Skill body 的大部分内容来自：
- **requirements.md** 的步骤定义
- **proposal.md** 的流程描述
- **project.yml** 的 workflow toggles（影响步骤是否执行）
- **conventions/** 的约定（需要引用时）
- profile 配置（影响 review 门控/并行策略）

### 3.5 13 个 Skill 清单

| Skill 名 | 对应步骤 | 核心指引内容 |
|---|---|---|
| `blueprint-init` | init | codebase mapping + spec bootstrap + 目录初始化 |
| `blueprint-grill` | grill | 需求探讨流程（21 项决策模版） |
| `blueprint-research` | research | 项目级技术调研流程（多方向并行） |
| `blueprint-roadmap` | roadmap | Milestone×M → Phase×N 路线图 |
| `blueprint-discuss` | discuss | Phase 讨论：context.md 产出 |
| `blueprint-research-phase` | research-phase | Phase 技术调研 |
| `blueprint-split` | split | Change 依赖图拆分 |
| `blueprint-plan` | plan | Change 设计：design+tasks+delta-specs |
| `blueprint-apply` | apply | 代码实现：TDD+分组并发 |
| `blueprint-review` | review | 三重审查：批量 tasks[3] |
| `blueprint-verify` | verify | 测试验证 + 诊断路由 |
| `blueprint-archive` | archive | delta 合并 + 代码认知回灌 |
| `blueprint-ship` | ship | Phase/Milestone 交付 |
| `blueprint-continue` | continue | 状态机推进流程 |

### 3.6 生成方案

```typescript
// src/generators/skills.ts

interface SkillDef {
  step: string;
  name: string;
  description: string;
  summary: string;
  prerequisites: string[];
  inputFiles: string[];
  steps: SkillStep[];
  outputs: string[];
  checklist: string[];
  pitfalls: string[];
}

interface SkillStep {
  title: string;
  details: string;
}

function generateSkill(def: SkillDef): string {
  const frontmatter = `---
name: ${def.name}
description: ${def.description}
---`;

  const body = `# ${def.name} — ${def.description}

## 概述
${def.summary}

${def.prerequisites.length ? `## 前置条件
${def.prerequisites.map(p => `- ${p}`).join('\n')}
` : ''}

## 输入
${def.inputFiles.map(f => `- ${f}`).join('\n')}

## 工作流流程
${def.steps.map((s, i) => `### ${i + 1}. ${s.title}
${s.details}
`).join('\n')}

## 输出产物
${def.outputs.map(o => `- **${o}**`).join('\n')}

${def.checklist.length ? `## 检查清单
${def.checklist.map(c => `- [ ] ${c}`).join('\n')}
` : ''}

${def.pitfalls.length ? `## 常见陷阱
${def.pitfalls.map(p => `- ${p}`).join('\n')}
` : ''}
`;

  return frontmatter + '\n' + body;
}
```

---

## 四、Context 注入机制：`blueprint context <step>`

### 4.1 设计目标

`blueprint context <step>` 是 spec 注入的核心入口。agent 在 slash command 中被指引「运行
`blueprint context <step>` 获取上下文清单」，然后逐个 `read` 输出中的文件路径。

**不注入内容本身，只注入文件路径**。原因：
1. 文件内容可能很大（specs/ 可能包含多个域），路径清单更省 token
2. agent 用 `read` 工具精确读取需要的部分（支持 offset/limit 选择器）
3. 路径清单是一次性的，agent 按需决定读多少

### 4.2 输出格式

#### 终端友好版（agent 消费）

```
=== blueprint context for step: plan ===
Change: add-auth (phases/v1/changes/add-auth/)
────────────────────────────────────────────────
Related specs:
  specs/security/auth.md              # 认证相关行为契约
  specs/common/error-handling.md      # 错误处理通用契约

Related conventions:
  conventions/coding.md               # 编码约定
  conventions/architecture.md         # 架构约定

Current change artifacts:
  milestones/v1/phases/add-auth/changes/add-auth/proposal.md
  milestones/v1/phases/add-auth/changes/add-auth/design.md
  milestones/v1/phases/add-auth/changes/add-auth/tasks.md

requirements.md:
  requirements.md:44-67               # 认证相关需求段落
  requirements.md:90-102              # TDD 相关需求段落
────────────────────────────────────────────────
Usage: use `read <path>` to load each file.
Selectors: `read <path>:50-100` for ranges.
```

#### JSON 格式（脚本消费，可选）

```json
{
  "step": "plan",
  "timestamp": "2026-06-29T10:30:00Z",
  "context": {
    "specs": [
      { "path": "specs/security/auth.md", "description": "认证相关行为契约" },
      { "path": "specs/common/error-handling.md", "description": "错误处理" }
    ],
    "conventions": [
      { "path": "conventions/coding.md" },
      { "path": "conventions/architecture.md" }
    ],
    "current_change": {
      "path": "milestones/v1/phases/add-auth/changes/add-auth/",
      "artifacts": [
        "proposal.md",
        "design.md",
        "tasks.md"
      ]
    },
    "requirements": {
      "path": "requirements.md",
      "ranges": [
        { "start": 44, "end": 67, "description": "认证相关" },
        { "start": 90, "end": 102, "description": "TDD 相关" }
      ]
    }
  }
}
```

**默认输出终端版**。提供 `--json` flag 输出 JSON。Agent 始终消费终端版。

### 4.3 注入内容范围

按步骤类型确定：

#### 项目层步骤（init / grill / research / roadmap）

```
specs/：所有（第一次初始化时需要全量）
conventions/：所有
requirements.md：全部
project.yml：全量
state.md：全量
research/：已有调研成果
```

#### Phase 层步骤（discuss / research-phase / split）

```
specs/：与本阶段目标域相关的部分
conventions/：所有
当前 milestone 的 goal.md 和已完成的 phase summary.md
requirements.md：全部（但标注相关段落）
```

#### Change 层步骤（plan / apply / review / verify / archive）

```
specs/：与当前 change 域相关的部分
conventions/：所有
当前 change 的 proposal/design/tasks（已产生的）
同一 change 下 spec-injection 范围内其他文件
requirements.md：相关段落
依赖 change 的输出（如果依赖图中有前置 change）
```

### 4.4 范围判定规则

`blueprint context` 需要知道哪些 specs 是"相关的"。判定规则：

1. **目录匹配**：如果 `specs/<domain>/` 中的 `<domain>` 与当前 change 名称或
   `tasks.md` 中引用的 domain 匹配，则纳入
2. **标签匹配**：如果 spec 文件的 frontmatter 中包含 `tags` 字段，与 change 的
   `tags` 有交集则纳入
3. **人工标注**：tasks.md 中 task 可以通过 `spec-ref: specs/domain/spec.md`
   显式引用
4. **无 spec 匹配时**：回退到全部 specs（agent 根据需求自行筛选）

### 4.5 CLI 实现要点

```typescript
// src/commands/context.ts

interface ContextScope {
  type: 'project' | 'milestone' | 'phase' | 'change' | 'adhoc';
  ref: string;
  step: string;
}

interface FileRef {
  path: string;
  description?: string;
  ranges?: { start: number; end: number; description?: string }[];
}

async function contextCommand(
  step: string,
  options: { json?: boolean } = {},
): Promise<void> {
  // 1. 读取 state.md 确定当前作用域
  const scope = await readState('state.md');

  // 2. 根据 step 类型确定注入范围
  const refs: FileRef[] = [];

  if (isProjectStep(step)) {
    refs.push(...getAllSpecs());
    refs.push(...getAllConventions());
    refs.push(...getProjectFiles());
  } else if (isPhaseStep(step)) {
    refs.push(...getRelatedSpecs(scope));
    refs.push(...getAllConventions());
    refs.push(...getPhaseFiles(scope));
  } else if (isChangeStep(step)) {
    refs.push(...getRelatedSpecs(scope));
    refs.push(...getAllConventions());
    refs.push(...getChangeArtifacts(scope));
    refs.push(...getRelevantRequirements(scope));
    refs.push(...getDependencyOutputs(scope)); // 并行 change 依赖
  }

  // 3. 输出
  if (options.json) {
    outputJson(formatContextJson(step, refs));
  } else {
    outputTerminal(formatContextTerminal(step, refs));
  }
}
```

### 4.6 状态机集成

`blueprint context` 不操作 state.md（只读）。`blueprint continue` 负责状态转换。

`blueprint context` 读取 state.md 确定"当前在哪"，但不写入任何状态。

---

## 五、集成陷阱和注意事项

### 5.1 Slash Command 陷阱

**T1: 空 .omp 目录被跳过**

OMP 的 native provider 要求 `.omp/` 目录非空。如果 `blueprint init` 创建了空的
`.omp/commands/` 但内容还没写入，OMP 会跳过整个 `.omp/` 目录，导致 discovery
走到上级目录。**必须**在 `blueprint init` 完成后立即执行 `blueprint update` 写入
文件，使 `.omp/commands/` 非空。

**T2: 命令名不要加斜杠**

Frontmatter `name` 字段不写 `name: /blueprint:plan`，而是 `name: blueprint:plan`。
OMP 在 expansion 时自动处理 `/` prefix。

**T3: Body 中路径引用**

Body 是 prompt 模板，被注入到 agent 上下文中。路径建议用相对路径（如
`blueprint context plan $1`），不要硬编码绝对路径。注意 body 中的反引号
（markdown 代码块）在 YAML frontmatter 后是合法的，不用额外转义。

**T4: 不要依赖参数校验**

OMP 的 `parseCommandArgs` 不做参数数量校验。如果 slash command 需要特定参数
（如 `blueprint:plan add-auth`），必须在 body 中检查参数是否存在，或在模板中提供
默认行为。不写 `$1` 时参数会被忽略而不是报错。

**T5: Subdirectory 文件被忽略**

OMP 扫描 `commands/*.md` 是非递归的。不能把命令文件放到子目录中。所有 13 个
`.omp/commands/blueprint-<step>.md` 文件必须平铺在一级。

### 5.2 Agent 陷阱

**T6: Agent Name 冲突**

OMP 使用 first-wins dedup 按 agent `name`。如果用户已有同名的 agent 定义
（比如其他项目的 `blueprint-executor`），当前项目的 agent 可能被 shadow。

**缓解策略**：
- 使用 `blueprint-` 前缀降低冲突概率
- 在 `blueprint update` 输出中提示"生成 agent 文件：若与已有文件冲突，项目级
  文件优先"

**T7: Agent 文件不是唯一的子代理来源**

OMP 的 agent 定义只影响 task 工具的行为。slash command 本身也可以内联子代理
调用，不需要先有 agent 定义（但 agent 定义让 task 工具能用更合适的模型和工
具集）。

未定义 agent 时，task 工具回退到默认 agent，模型角色使用 session 的 default
model。这可能导致研究/审查任务使用高效的默认模型而非慢模型，降低输出质量。

**T8: spawns 字段影响子代理层级递归**

OMP 的 `spawns` 控制子代理能否继续创建子代理。默认情况下，tools 包含 task
时 spawns 自动为 `*`。在 `verify` 和 `archive` 步骤中如果需要限制深度，显
式设置 `spawns: ""`（禁止再 spawn）或具体列表。

spawns 字段不会传播到孙代理。如果 A spawns B，B 能 spawn C 取决于 B 自己的
spawns 字段，与 A 的 spawns 无关。

**T9: 深度 gating 导致 task 工具不可用**

OMP 的 `task.maxRecursionDepth` 控制最大递归深度。超出时 task 工具从子代理
的工具集中移除（而不是报错）。对 blueprint 的三层嵌套（slash command → agent →
sub-agent → sub-sub-agent），如果在 strict profile 中配置了 low maxRecursionDepth，
可能导致深度不足。

**缓解**：在 `blueprint` 文档中说明 agent 深度需求（3 层），引导用户配置
`maxRecursionDepth: 4`（安全边界）。

### 5.3 Skill 陷阱

**T10: Skill 目录层级限制**

OMP 只发现 `skills/<name>/SKILL.md` 一层嵌套。不支持 `skills/group/name/SKILL.md`。
13 个 skill 都必须平铺在 `skills/blueprint-<step>/SKILL.md` 模式下。不能为了
组织性放子目录。

**T11: Body 不自动注入**

Skill 文件是"被动"的——agent 必须显式调用 `read skill://<name>` 读取。
slash command body 中应包含 `read skill://blueprint-<step>` 的指令。不要假设
skill 内容自动出现在 agent 上下文中。

**T12: 同名的 skill 覆盖**

如果用户的项目中已经有同名 skill（如其他插件提供的 `blueprint-plan`），项目级
skill 按优先级规则覆盖。但如果用户手动创建了 `~/.omp/agent/skills/blueprint-plan/`
，会 shadow 项目级技能。这可能是用户有意为之（自定义），生成时不需要覆盖。

**T13: /skill: 命令的分发模式**

`/skill:<name>` 在交互式模式中，Enter 走 steer 队列（中断当前输出插队），
Ctrl+Enter 走 followUp 队列（当前输出完成后执行）。这个行为是按键决定的，
无法通过 frontmatter 覆盖。blueprint 的 slash command 不需要这个功能，所以
无关紧要。

### 5.4 Context 注入陷阱

**T14: 文件路径是相对还是绝对**

CLI 输出相对路径（相对于项目根）（如 `specs/auth/spec.md`），而不是绝对路径。
agent 通常以项目根为 cwd 运行，相对路径更简洁且可移植。

**但**：task 子代理的 cwd 可能不同。OMP 的 task 工具默认在 `session.cwd` 下
运行子代理。只要 blueprint CLI 和 agent 在同一个项目根启动，相对路径是安全的。

**T15: 文件选择器语法**

agent 的 `read` 工具支持 `file.ts:50-100` 选择器。context 命令输出的行范围
（如 `requirements.md:44-67`）可以直接粘贴到 read 命令中。输出格式应与 `read`
工具的选择器语法兼容。

**T16: 大项目性能**

对于大型项目，`blueprint context plan` 可能需要遍历 specs/ 目录查找相关文件。
如果 specs/ 很大（几百个文件），需要缓存或索引。建议：
- context 命令输出只包含文件路径（不读内容），所以遍历是轻量的
- 相关文件查找可以用 project.yml 的 tags 字段缓存在内存
- 如果 change 有显式的 `spec-ref:`，直接引用，不需要全量搜索

**T17: 依赖 change 的 context 同步**

在依赖图并行执行 change 时，B 依赖 A。A 还没完成时 `blueprint context plan B`
不应该引用 A 的产出（因为还不存在）。context 命令应该检查 state.md 中依赖
change 的状态，只输出已完成的部分。

### 5.5 `blueprint update` 通用陷阱

**T18: 多次运行覆盖用户修改**

`blueprint update` 会覆盖 `.omp/commands/` 和 `.omp/agents/` 和 `skills/` 下
blueprint 生成的文件。如果用户手动修改了生成的文件，下次 update 会丢失修改。

**缓解方案**：
1. 文件头添加注释标记 `# Generated by blueprint update — do not edit by hand`
2. 提供 warning：每次 update 时检测文件 hash，如果与上次生成不同，显示 diff
   并确认是否覆盖
3. 或提供 `--force` flag 跳过确认

**T19: 空行在不同 OMP 版本行为不同**

OMP 的 frontmatter 解析使用 `parseFrontmatter`。不同版本的 OMP 对 frontmatter
后的空行可能不同处理。建议生成时保持一致的格式：frontmatter 后空一行再 body。

**T20: 多个平台的隔离**

project.yml 的 platform 列表未来会包含 `claude-code`。生成时要按 platform
隔离输出目录：
- OMP: `.omp/commands/` + `.omp/agents/` + `skills/`
- Claude Code: `.claude/commands/` + `.claude/agents/`

但... Claude Code 的 agent 定义格式可能不同（OMP 定义的是 OMP 专用格式）。
所以当 platform 包含非 OMP 平台时，需要为每个平台使用不同的生成器。

---

## 六、`blueprint update` 生成器架构

```typescript
// src/commands/update.ts
// src/generators/index.ts

interface GeneratorContext {
  projectConfig: ProjectConfig;   // 来自 project.yml
  profileModelMap: ModelMap;       // profile 默认值
  steps: StepDef[];                // 从 requirements.md 或内置表
  agentDefs: AgentDef[];           // 6 个 agent 定义
  platform: string;                // 'omp' | 'claude-code'
}

interface GeneratedFile {
  path: string;                    // 目标路径，如 .omp/commands/blueprint-plan.md
  content: string;
  platform: string;
}

type Generator = (ctx: GeneratorContext) => GeneratedFile[];

// 三个生成器
const slashCommandGenerator: Generator;
const agentGenerator: Generator;
const skillGenerator: Generator;

// update 命令
async function updateCommand(): Promise<void> {
  const ctx = await loadGeneratorContext('project.yml');

  // 根据 platform 选择生成器
  const generators: Record<string, Generator[]> = {
    omp: [slashCommandGenerator, agentGenerator, skillGenerator],
    'claude-code': [claudeSlashCommandGenerator, claudeAgentGenerator, claudeSkillGenerator],
  };

  const toWrite = [];
  for (const platform of ctx.projectConfig.platform) {
    for (const gen of generators[platform] ?? []) {
      toWrite.push(...gen(ctx));
    }
  }

  // 批量写入
  for (const file of toWrite) {
    ensureDir(dirname(file.path));
    writeFile(file.path, file.content);
  }

  console.log(`Generated ${toWrite.length} files for platforms: ${platforms}`);
}
```

**文件结构**：

```
src/
└── generators/
    ├── index.ts              # GeneratorContext, Generator 类型, 调度
    ├── slash-commands.ts     # .omp/commands/*.md 生成
    ├── agents.ts             # .omp/agents/*.md 生成
    ├── skills.ts             # skills/<name>/SKILL.md 生成
    ├── context.ts            # blueprint context <step> 逻辑
    ├── steps.ts              # 13 个步骤定义（共享）
    ├── models.ts             # profile → model 映射（共享）
    └── templates/            # body 模板（可选）
        ├── plan-body.md
        ├── ...
```

---

## 七、完整模板示例汇总

### Slash Command: `.omp/commands/blueprint-plan.md`

```markdown
---
name: blueprint:plan
description: 执行 Change 设计：需求分析→方案设计→任务拆分→delta-spec 预写
---

# 工作流: Change 设计 (plan)

## 1. 获取上下文
\`\`\`
blueprint context plan $1
\`\`\`

## 2. 读取工作流指引
用 \`read skill://blueprint-plan\` 获取详细设计流程。

## 3. 执行设计
- 分析 proposal.md 了解变更需求
- 查阅 specs/ 和 conventions/
- 设计技术方案 → design.md
- 拆分为实现任务 → tasks.md
- 预写 delta-specs

## 4. 产物管理
通过 bash 调用 blueprint CLI 管理产物和状态转换。

## 5. 子代理
必要时用 task 工具 fan-out 子代理（blueprint-researcher/blueprint-planner）。
```

### Agent: `.omp/agents/blueprint-researcher.md`

```markdown
---
name: blueprint-researcher
description: 技术调研：产出 STACK/ARCH/PITFALLS/RESEARCH 文档
tools:
  - read
  - grep
  - glob
  - lsp
  - web_search
  - write
  - bash
model: slow
thinkingLevel: high
spawns: "*"
---

你是一个 blueprint 的 **researcher** 子代理。

## 核心约束
- 所有产物写入 blueprint/ 目录
- 通过 bash 调用 blueprint CLI 管理状态和转换
- 遵守 project.yml 的 context 字段
- 遵守 conventions/ 下的项目约定

## 输出要求
- stack.md：技术栈评估（候选方案对比表 + 推荐）
- architecture.md：架构决策（技术选型 + 架构描述）
- pitfalls.md：集成陷阱（至少 10 条，含模板/示例）
- research.md：完整调研过程（含放弃方案的记录）

## 步骤
1. 读取 specs/ 和 conventions/ 了解项目上下文
2. 并行调研多个方向（CLI 框架 / 数据层 / OMP 集成 / ...）
3. 每个方向产出对比表（方案、优劣势、推荐）
4. 综合评估，提供决策意见
5. 将结果写入 blueprint/research/ 目录
```
