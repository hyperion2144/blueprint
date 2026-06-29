# specwf — 规格驱动开发工作流

spec-driven development workflow for AI coding agents.

specwf 融合 OpenSpec、GSD Core、Trellis 的核心能力，提供从需求探讨到交付的完整规格驱动开发工作流。

## 安装

```bash
npm install -g specwf
```

## 快速开始

```bash
# 1. 初始化项目
specwf init

# 2. 生成平台文件
specwf update

# 3. 查看当前状态
specwf state

# 4. 查看下一步
specwf continue

# 5. 生成模板文件
specwf template proposal --name my-feature
```

## 工作流

```
init → grill → research → roadmap → discuss → plan → apply → review → verify → archive → ship
```

- **init**: 初始化 specwf 项目结构
- **grill**: 需求探讨（无限制细节提问）
- **research**: 技术调研（并行多方向）
- **roadmap**: 拆分里程碑和阶段
- **discuss**: Phase 讨论，捕获实现决策
- **plan**: Change 设计（TDD 强制）
- **apply**: 代码实现（分组子代理并发）
- **review**: 三重审查（规格/质量/目标并行）
- **verify**: 测试验证（诊断回环）
- **archive**: 归档（delta-spec 合并 + 代码认知回灌）
- **ship**: 交付（PR + 状态更新）

## 命令

| 命令 | 说明 |
|---|---|
| `specwf init` | 初始化项目 |
| `specwf update` | 更新平台文件 |
| `specwf config` | 查看/修改配置 |
| `specwf state` | 查看状态 |
| `specwf context <step>` | 输出上下文清单 |
| `specwf continue` | 自动推进 |
| `specwf archive <change>` | 归档 change |
| `specwf list` | 列出 milestones/phases/changes |
| `specwf template <type>` | 生成模板文件 |

## 配置

`specwf/project.yml` 中的关键配置：

- `profile`: 工作流严格度 (`lite` / `standard` / `strict`)
- `platform`: 目标平台 (`omp` / `claude-code`)
- `workflow.tdd`: TDD 强制
- `review.gate`: review 门控 (`all-pass` / `severity` / `report-only`)

## 自举

specwf 用自身的工作流构建了自己。详见 `specwf/state.md` 了解完整构建历史和 21 项设计决策。

## License

MIT
