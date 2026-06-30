# Change 设计

为当前 Change 设计技术方案、拆分为可执行任务、并预先编写 delta-specs 行为契约。使用 specwf-planner agent 完成。

---

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前处于 plan 阶段。continue 校验前置条件（proposal.md 存在且非模板）后自动推进。

### 步骤 2：获取上下文

```bash
specwf context plan
```

读取以下文件：
- `@specwf/context.md` — 已锁定决策和自由探索领域
- `changes/<name>/proposal.md` — Change 意图、范围、must-haves
- `@specwf/specs/` — 已有全局行为契约
- `@specwf/conventions/` — 编码规范

### 步骤 3：派发子代理执行设计

派发 `specwf-planner` 子代理（完整 system prompt 见 `.omp/agents/specwf-planner.md`）。

提示词内容：

```text
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

#### 子代理产出物

| 文件 | 模板 |
|------|------|
| design.md | specwf template design |
| tasks.md | specwf template tasks |
| specs/<domain>/spec.md | specwf template spec-bootstrap |

### 步骤 4：验证

运行 plan-checker 自动检查：
- [ ] 所有 tasks 标注了 type
- [ ] type:behavior 任务有完整的 RED 测试描述
- [ ] delta-specs 覆盖了 proposal.md 中所有的 must_haves
- [ ] 与 context.md 中的决策无矛盾（drift check）
- [ ] 依赖图完整（跨 Change 的 key_links 已标注）
- [ ] 每个 task 有明确的完成标准

### 步骤 5：推进

```bash
specwf continue
```

continue 检查 design.md + tasks.md 完整且非模板后，推进到 apply 阶段。

---

## 参数

```
change <name>
```

不传时查看 `specwf state` 待处理列表。

## 产出

| 文件 | 说明 | 模板 |
|------|------|------|
| changes/<name>/design.md | 技术方案（架构、数据流、接口、备选方案） | `specwf template design` |
| changes/<name>/tasks.md | 实现清单（含 TDD type 标注） | `specwf template tasks` |
| changes/<name>/specs/<domain>/spec.md | Delta-specs 行为契约 | `specwf template spec-bootstrap` |

## 参考

技能文件：`.omp/skills/specwf-plan/SKILL.md`
