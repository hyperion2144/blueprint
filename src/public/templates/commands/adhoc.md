# 临时 Change

与 milestone/phase 无关的独立变更，直接走标准 Change 循环。适用于紧急修复、独立改进等场景。

| | |
|---|---|
| **描述** | 临时 Change — 与 milestone/phase 无关的独立变更，创建后通过 `specwf continue change <name>` 逐阶段推进，各阶段对应相应 agent |
| **执行 agent** | 创建：specwf-adhoc（初始结构 + 模板生成）<br>后续：各阶段对应 agent（specwf-planner → specwf-executor → specwf-reviewer → specwf-verifier → specwf-archiver），通过 `specwf continue change <name>` 自动路由 |
| **产出** | proposal.md（提议）、design.md（设计）、tasks.md（任务） |
| **产出模板** | `specwf template artifacts/proposal.md` · `specwf template artifacts/design.md` · `specwf template artifacts/tasks.md` |
| **上下文** | `specwf context adhoc` + `specwf state` |
| **推进** | `specwf continue change <change-name>` |
| **引用技能** | `skills/specwf-adhoc/SKILL.md` |

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前处于 adhoc 阶段。运行 `specwf continue` 校验前置条件。

### 步骤 2：获取上下文

```bash
specwf context adhoc
```

读取输出的文件清单。


## 创建

```bash
specwf change new <change-name>
```

CLI 自动创建 `specwf/changes/<change-name>/` 目录并生成模板文件：
- proposal.md（提议模板）
- design.md（设计模板）
- tasks.md（任务模板）
- specs/（delta-specs 目录）

## 阶段推进

临时 Change 走标准 Change 循环，通过 `specwf continue change <change-name>` 自动读取当前状态并路由到下一阶段：

| 阶段 | agent | 产出 |
|------|-------|------|
| plan | specwf-planner | design.md + tasks.md + delta-specs |
| apply | specwf-executor | 代码变更 + 测试 |
| review | specwf-reviewer | spec-review.md + quality-review.md + goal-review.md |
| verify | specwf-verifier | VERIFICATION.md |
| archive | specwf-archiver | specs/ 合并 + 归档 |

## 上下文

```bash
specwf context adhoc
specwf state
```

`specwf context adhoc` 输出当前项目上下文和临时 Change 概况，`specwf state` 显示状态机当前位置和 Change 状态。

## 查看状态

```bash
specwf continue change <change-name>
```

读取该 Change 的当前状态，输出下一步建议和 slash command。

## 归档

```bash
specwf archive specwf/changes/<change-name>
```

临时 Change 归档后统一存放在 `specwf/archive/` 下。

## 常见陷阱

- 临时 Change 不走 milestone/phase 的 discuss/research-phase/split 流程
- 如果需要关联到 phase，使用 `specwf change new --phase <id>`
- 归档后原始产物可追溯，无需手动清理

## 参考

技能文件：`skills/specwf-adhoc/SKILL.md`
