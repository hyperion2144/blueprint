# Change 设计

为当前 Change 设计技术方案、拆分为可执行任务、并预先编写 delta-specs 行为契约。使用 specwf-planner agent 完成 design → specs → tasks 的串行设计过程。

## 子代理

### 子代理类型
`specwf-planner`（完整 system prompt 见 `.omp/agents/specwf-planner.md`）

### 子代理提示词结构

派发时，提示词应包括：

```
子代理类型: specwf-planner
描述: Change 设计 — 设计技术方案、拆分任务、预写 delta-specs

【项目上下文】
- 从 context.md 提取 locked decisions 和 discretion area
- 从 proposal.md 提取 must-haves
- 从 specs/ 提取现有规格约束

【本次职责】
- 设计技术方案 → design.md（模板: specwf template design）
- 拆分可执行任务 → tasks.md（模板: specwf template tasks）
- 预写 delta-specs → specs/<domain>/spec.md（模板: specwf template spec-bootstrap）

【约束条件】
- 遵守 proposal.md 的 must-haves，不缩小范围
- 遵守 context.md 的 locked decisions
- 所有产物写入 specwf/ 目录
- type:behavior task 走 RED→GREEN→REFACTOR
```

### 产出物

|文件|模板|
|---|---|
|design.md|specwf template design|
|tasks.md|specwf template tasks|
|specs/<domain>/spec.md|specwf template spec-bootstrap|

| | |
|---|---|
| **描述** | Change 设计 — 技术方案 + 任务拆分 + 预写 delta-specs |
| **子代理** | 派发 specwf-planner 子代理，负责：<br>- 设计技术方案 → design.md<br>- 拆分可执行任务 → tasks.md<br>- 预写 delta-specs → specs/&lt;domain&gt;/spec.md |
| **产出** | design.md（技术方案）、tasks.md（任务清单）、specs/&lt;domain&gt;/spec.md（delta-specs） |
| **产出模板** | `specwf template artifacts/design.md` · `specwf template artifacts/tasks.md` · `specwf template specs/spec.md` |
| **上下文** | `specwf context plan` + `specwf state` |
| **推进** | `specwf continue` |
| **引用技能** | `skills/specwf-plan/SKILL.md` |

## 上下文

```bash
specwf context plan
specwf state
```

`specwf context plan` 输出当前 Phase 上下文：相关的 specs、conventions、context.md、外部依赖文档。`specwf state` 显示状态机当前位置和当前 Change 标识。

可参考：
- `@specwf/context.md` — 已有实现决策和约束
- `changes/<name>/proposal.md` — Change 意图、范围、must-haves
- `@specwf/specs/` — 已有全局行为契约
- `@specwf/conventions/` — 编码规范

## 设计流程

### 1. 技术方案 — design.md

使用 `specwf template artifacts/design.md` 模板生成 design.md，包含：
- 背景与目标、架构变化（新增/修改/删除模块）
- 核心数据结构、数据流、接口设计
- 文件清单、测试策略、备选方案、风险点

### 2. 编写 delta-specs

在 `changes/<name>/specs/<domain>/spec.md` 中预先写入本次 Change 的行为契约：

- **SHALL** `<条件>`: `<预期行为>` — 附带 GIVEN/WHEN/THEN 场景
- **MUST** `<约束>` — 附带 GIVEN/WHEN/THEN 场景
- 覆盖正常路径、边界路径、异常路径
- 只写本次 Change 引入或修改的行为

### 3. 任务拆分 — tasks.md

使用 `specwf template artifacts/tasks.md` 模板生成 tasks.md：

| type | 含义 | TDD 协议 |
|------|------|---------|
| `behavior` | 业务行为 | **RED→GREEN→REFACTOR**（强制） |
| `config` | 配置文件 | 直接实现 |
| `refactor` | 重构 | 先验证后重构 |
| `docs` | 文档 | 直接实现 |
| `scaffolding` | 骨架代码 | 直接实现 |

### 4. 验证

运行 plan-checker 自动检查：
- [ ] 所有 tasks 标注了 type
- [ ] type:behavior 任务有完整的 RED 测试描述
- [ ] delta-specs 覆盖了 proposal.md 中所有的 must_haves
- [ ] 与 context.md 中的决策无矛盾（drift check）
- [ ] 依赖图完整（跨 Change 的 key_links 已标注）
- [ ] 每个 task 有明确的完成标准

## 下一步

完成后：

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```

`specwf continue` 将读取 state.md，状态机推进到 apply 阶段开始实现。

## 参考

技能文件：`.omp/skills/specwf-plan/SKILL.md`
