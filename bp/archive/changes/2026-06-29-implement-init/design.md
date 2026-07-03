# Design: CLI 命令层

## 目标

实现 9 个 CLI 子命令，用户在终端通过 `blueprint <cmd>` 完整操作 blueprint。

## 命令清单与实现方案

| 命令 | 核心逻辑 | 依赖 |
|---|---|---|
| `blueprint init` | @clack/prompts 向导 → file-tree.createSpecwfStructure → 写入 project.yml/state.md → 调用 update | file-tree + config + generators |
| `blueprint update` | loadConfig → generateAll → 写入 .omp/commands/*.md + .omp/agents/*.md | config + generators |
| `blueprint config [set]` | config + list 模式：loadConfig → 格式化输出；config set：updateConfig | config |
| `blueprint state` | loadState → 格式化输出 frontmatter + body | state-file |
| `blueprint context <step>` | generateContext → formatContextTerminal → console.log | spec-injector + state-file |
| `blueprint continue` | determineNextStep → 格式化输出当前位置 + 下一步 | continue + state-file |
| `blueprint archive <change>` | 校验 change 存在 → mergeAndWrite → extractFromGitDiff → writeExtractionToSpec → file-tree.archiveChangeDir → updateState | delta-merge + code-extract + file-tree + state-file |
| `blueprint list` | 遍历 milestones/phases/changes → 格式化树形输出 | file-tree |
| `blueprint template <type>` | 复制模板文件到目标目录 | file-tree |

## 文件结构

```
src/commands/
├── blueprint-init.ts       # blueprint init
├── blueprint-update.ts     # blueprint update
├── blueprint-config.ts     # blueprint config / config set
├── blueprint-state.ts      # blueprint state
├── blueprint-context.ts    # blueprint context <step>
├── blueprint-continue.ts   # blueprint continue
├── blueprint-archive.ts    # blueprint archive <change>
├── blueprint-list.ts       # blueprint list
├── blueprint-template.ts   # blueprint template <type>
src/prompts/
├── init-wizard.ts       # init 交互向导（@clack/prompts）
```

每个命令文件导出一个 `register` 函数，在 `src/cli.ts` 中注册到 commander。

## 技术决策

- archive 命令：先调用 delta-merge 合并，再调用 code-extract 提取，最后 move 到 archive/
- init 命令：创建骨架后自动调用 update 生成平台文件
- list 命令：按 milestone > phase > change 三级树形缩进
