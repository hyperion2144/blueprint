# Research Summary

> 调研时间: 2026-06-29
> 三个方向并行调研，此文档汇总决策。

---

## 技术栈选型

| 类别 | 选择 | 理由 | 详见 |
|---|---|---|---|
| CLI 框架 | **commander ^14** + **@clack/prompts** | commander 子命令组织成熟、生态最大；@clack 交互式 prompt 美观轻量 | [stack.md](stack.md) |
| YAML 解析 | **yaml (eemeli) 2.x** + **zod** | 支持注释保留（project.yml/state.md 写回关键需求）、Document API、内置 TS 类型。**覆盖 stack.md 的 js-yaml 推荐**——js-yaml v4 不支持注释保留 | [architecture.md](architecture.md) |
| Frontmatter | **gray-matter 4.x** | 生态最成熟（16M月下载）、支持 stringify、edge case 全覆盖 | [architecture.md](architecture.md) |
| 构建工具 | **tsup ^8** | 零配置、esbuild 快、ESM + dts 一步输出 | [stack.md](stack.md) |
| 类型检查 | **tsc --noEmit** | 官方类型检查器 | [stack.md](stack.md) |
| 测试 | **vitest ^3** | 快、ESM 原生、TS 无需额外配置 | [stack.md](stack.md) |
| 日志 | **consola ^3** | 轻量美观、支持 spinner | [stack.md](stack.md) |

### 冲突解决

| 冲突 | stack.md 推荐 | architecture.md 推荐 | 最终决策 | 理由 |
|---|---|---|---|---|
| YAML 库 | js-yaml ^4（最成熟） | yaml(eemeli) 2.x（注释保留） | **yaml(eemeli)** | project.yml 和 state.md 写回时需保留注释，js-yaml v4 不支持此功能，是排除它的关键原因 |

## 核心架构决策

### delta-spec 合并算法

**层级感知的三向合并**（详见 [architecture.md](architecture.md) §3）：

1. 解析 spec 为 heading tree（## Purpose / ### Requirement / #### Scenario）
2. 按 heading 层级做三向合并（base=全局 specs、ours=delta-specs、theirs=手动修改）
3. 每个 section 用 SHA-256 fingerprint 做冲突检测
4. 冲突时标记 `CONFLICT` 标记，不自动解决

### 状态机

**纯数据驱动，不引入 FSM 库**（详见 [architecture.md](architecture.md) §4）：

- 四层路径：project / milestone / phase / change
- 状态转移表定义合法转移
- continue 命令读 state.md → 查转移表 → 确定下一步 → 映射到 slash command

### context 注入机制

**CLI 输出文件路径列表 + 行范围**（详见 [pitfalls.md](pitfalls.md) §4）：

- `blueprint context <step>` 读取 state.md 确定当前作用域
- 按步骤类型（project/phase/change）确定注入范围
- 输出格式与 read 工具的选择器语法兼容（`requirements.md:44-67`）

## OMP 集成方案

### 文件生成

| 文件类型 | 路径 | 来源 | 详见 |
|---|---|---|---|
| Slash commands | `.omp/commands/blueprint-*.md` | 步骤定义表 → frontmatter + prompt body | [pitfalls.md](pitfalls.md) §1 |
| Agent 定义 | `.omp/agents/blueprint-*.md` | 6 个角色定义 + project.yml models 配置 | [pitfalls.md](pitfalls.md) §2 |
| Skills | `skills/blueprint-*/SKILL.md` | 步骤工作流指引 | [pitfalls.md](pitfalls.md) §3 |

### 生成器架构

`blueprint update` 命令的核心流程：
1. 读取 project.yml（platform / profile / models / workflow）
2. 内置步骤定义表 → 生成 slash command 文件
3. 内置 agent 定义表 + models 配置 → 生成 agent 文件
4. 内置 skill 内容 → 生成 skill 文件

## 关键陷阱（20 条，详见 pitfalls.md §5）

1. **OMP 命令非递归扫描**：`.omp/commands/*.md` 只扫一层，不支持子目录
2. **Agent first-wins**：project `.omp/agents/` 覆盖 user 目录，同名 agent 后者被丢弃
3. **model 字段引用 OMP 角色**：不硬编码模型 ID，用 slow/default/smol 角色名
4. **gray-matter ESM 问题**：某些打包环境有 CJS/ESM 冲突，备选自实现极简版
5. **context 输出与 read 兼容**：行范围格式需匹配 read 工具选择器语法
6. **依赖图并行时 context 不引用未完成 change**：检查 state.md 中依赖状态

## 项目目录结构

```
blueprint-cli/
├── bin/
│   └── blueprint.js                    # 入口（shebang）
├── src/
│   ├── cli/
│   │   ├── index.ts                 # commander 主入口
│   │   └── commands/                # 每个子命令一个文件
│   ├── core/
│   │   ├── config.ts                # project.yml 读写
│   │   ├── state-machine.ts         # 状态机引擎
│   │   ├── state-file.ts            # state.md 读写
│   │   ├── spec-injector.ts         # context 命令核心
│   │   ├── delta-merge.ts           # delta-spec 合并
│   │   ├── code-extract.ts          # 代码认知提取（archive 回灌）
│   │   └── platform-gen.ts          # 平台文件生成器
│   ├── data/
│   │   ├── yaml.ts                  # yaml Document API 封装
│   │   ├── frontmatter.ts           # gray-matter 封装
│   │   ├── heading-tree.ts          # Markdown heading tree 解析
│   │   └── spec-parser.ts           # spec 结构化解析
│   └── templates/                   # 内置模板
│       ├── project.yml              # 新项目配置模板
│       ├── state.md                 # 初始 state.md
│       ├── change.blueprint.yaml       # change 元数据模板
│       └── proposal.md              # change proposal 模板
├── tests/                           # 与源文件同目录的 *.test.ts
├── package.json
├── tsconfig.json
└── tsup.config.ts
```

## 下一步

调研完成。进入 roadmap 阶段——拆分 milestone 和 phase。
