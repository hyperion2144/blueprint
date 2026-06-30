# Change 设计

为当前 Change 设计技术方案、拆分为可执行任务、并预先编写 delta-specs 行为契约。使用 specwf-planner agent 完成 design → specs → tasks 的串行设计过程。

| | |
|---|---|
| **描述** | Change 设计 — 技术方案 + 任务拆分 + 预写 delta-specs |
| **子代理** | specwf-planner |
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

`specwf continue` 将读取 state.md，状态机推进到 apply 阶段开始实现。

## 参考

技能文件：`.omp/skills/specwf-plan/SKILL.md`
