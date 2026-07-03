# Phase 5 Context: CLI 命令层

> 讨论时间: 2026-06-29
> 决策来源: roadmap.md + research/pitfalls.md §4 + Phase 1-4 已实现的各模块

## Phase 目标

所有 9 个 CLI 子命令可用，用户能通过命令行完整操作 blueprint。Phase 5 是 CLI 对用户的第一接触面。

## 已实现（Phase 1-4）

- `src/cli.ts` — commander 主入口（已有 --version）
- `src/core/config.ts` — project.yml 读写
- `src/core/state-machine.ts` — 状态机引擎
- `src/core/state-file.ts` — state.md 读写
- `src/core/continue.ts` — continue 逻辑
- `src/core/spec-injector.ts` — context 注入
- `src/core/delta-merge.ts` — delta-spec 合并
- `src/core/code-extract.ts` — 代码认知提取
- `src/core/file-tree.ts` — 目录操作
- `src/generators/` — 平台文件生成

## 待实现（Phase 5）

### 命令清单

| 命令 | 依赖的 core 模块 | 复杂度 |
|---|---|---|
| `blueprint init` | file-tree + config + generators | 高（交互式向导 + 创建骨架 + 调用 update） |
| `blueprint update` | config + generators | 中（读配置 → 调度生成器 → 写文件） |
| `blueprint config` | config | 低（读 + 写 project.yml） |
| `blueprint state` | state-file | 低（读 state.md → 格式化输出） |
| `blueprint context <step>` | spec-injector + state-file | 中（读状态 → 注入 → 输出文件清单） |
| `blueprint continue` | continue + state-file | 中（读状态 → 确定下一步 → 输出） |
| `blueprint archive <change>` | delta-merge + code-extract + file-tree | 高（合并 → 提取 → 移动 → 更新状态） |
| `blueprint list` | file-tree | 低（遍历目录 → 格式化输出） |
| `blueprint template <type>` | file-tree | 低（复制内置模板到目标目录） |

### 实现决策

D1: **init 命令**需要 @clack/prompts 做交互式向导（选择 profile、输入 context）。
D2: **update 命令**调度 generators 后写入 .omp/ 目录和 skills/ 目录。
D3: **archive 命令**最复杂——调用 delta-merge（Section 级合并）、code-extract（git diff 提取）、file-tree（目录移动）。
D4: **context 命令**输出终端友好格式（带 === 标题、文件清单、格式说明）。
D5: 所有命令通过 `console.log` / `console.error` 输出，不使用外部日志库。

## Change 拆分

1 change: `implement-cli-commands` — 所有 9 个命令 + init-wizard + cli.ts 更新
