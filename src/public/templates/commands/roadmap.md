# 路线图拆分

将项目拆分为 Milestone × Phase 两级规划。Milestone 是长期里程碑（通常 1-3 个月），每个包含一组 Phase；Phase 是 Milestone 内的开发阶段（通常 1-2 周，产出可演示的增量）。路线图基于 requirements.md 和（可选的）research 产出，输出可执行的阶段规划作为后续所有工作的导航图。

## 子代理

无（由主 agent 根据需求和项目范围手动编写）

## 前置条件

确认以下就绪状态：

- [ ] 已通过 grill 阶段，需求文档 @specwf/requirements.md 已锁定范围和功能
- [ ] （可选）已完成 research — 调研结果指导技术栈和阶段拆分
- [ ] 对项目范围有清晰共识，scope 边界明确

## 执行步骤

### 1. 加载上下文

```bash
specwf context roadmap
specwf state
```

可参考：
- @specwf/requirements.md — 需求范围与功能列表
- @specwf/research/ — （如有）技术调研结果

### 2. 定义 Milestone

按功能领域或发布节奏划分里程碑。每个里程碑记录：

| 属性 | 说明 | 示例 |
|------|------|------|
| **ID** | 简短标识 | `M1-core` |
| **目标** | 一句话描述里程碑目标 | 搭建基础 CLI 框架 + spec 管理系统 |
| **范围** | 包含和不包含的功能 | 完整 specwf 循环（init→archive） |
| **成功标准** | 可测量的完成条件 | CLI 可通过所有 E2E 测试 |
| **预估时长** | 1-3 个月 | 6 周 |

### 3. 为每个 Milestone 拆分 Phase

每个里程碑包含 3-8 个 Phase。结构示例如下：

```
<ms-name>
├── ph.1 基础搭建
├── ph.2 核心功能 A
├── ph.3 核心功能 B
├── ph.4 集成测试
└── ph.5 文档和完善
```

每个 Phase 定义完整的元信息：

| 属性 | 说明 | 示例 |
|------|------|------|
| **ID** | `ph.N-<name>` | `ph.1-foundation` |
| **目标** | 本 Phase 产出什么 | 搭建项目骨架和 CI 基础 |
| **依赖** | 前置 Phase 或外部依赖 | `无` 或 `ph.1` |
| **输入** | specs、conventions、设计文档 | `@specwf/specs/cli/spec.md` |
| **输出** | 代码、specs 更新、文档 | 可运行的命令行初始版本 |
| **预估 Change 数** | 本 Phase 包含几个 Change | 3 |

### 4. 验证里程碑覆盖

逐项检查 requirements.md 的范围是否被完整覆盖：

- [ ] 所有功能范围已被 Milestone 和 Phase 覆盖，无遗漏
- [ ] Phase 之间的依赖关系合理，不形成循环依赖
- [ ] 每个 Phase 有可验证的成功标准
- [ ] 路线图总 Phase 数合理（3-15 个）
- [ ] 第一个 Phase 是最小可行路径（不是最复杂的部分）

### 5. 写入 roadmap.md

产出 `specwf/roadmap.md`。自由格式，推荐大纲：

```markdown
# <项目> 路线图

## Milestone 概览

| Milestone | 目标 | Phase 数 | 时长 |
|-----------|------|----------|------|
| M1 — Core | CLI 框架 | 5 | 6w |

## M1 — Core Infrastructure

搭建基础 CLI 框架 + spec 管理系统。

### Phase 列表

| Phase | 目标 | 依赖 | 预估 Change 数 |
|-------|------|------|----------------|
| ph.1  |      | 无   |               |

### ph.1 <名称>

详细说明、关键决策、注意事项。
```

## 产出一览

| 产出文件 | 说明 | 生成命令 |
|---------|------|----------|
| `specwf/roadmap.md` | 完整路线图文档（自由格式内容） | 无模板（手动编写） |

## 参考

- `skills/roadmap.md` — 路线图工作流指引（拆分方法、验证清单、常见陷阱）

## 下一步

完成编写并确认覆盖后：

```bash
# 切换到第一个 Milestone（多里程碑项目）
specwf state set-milestone <id>

# 或直接推进（单里程碑项目，状态机会自动读 roadmap.md）
specwf continue
```
