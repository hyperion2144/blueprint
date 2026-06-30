# 归档

Change 循环的收尾阶段。负责三件事：(1) 将 delta-specs 确定性合并到全局 specs/；(2) 从代码 diff 中提取新的行为和约束，回灌到 specs/ 中；(3) 将原始产物目录移动到 `archive/<date>-<name>/` 下持久保存。归档完成后，Change 的工作永久记录在 specs/ 和 archive/ 中，供后续 Change 参考和追溯。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前处于 archive 阶段。运行 `specwf continue` 校验前置条件。

### 步骤 2：获取上下文

```bash
specwf context archive
```

读取输出的文件清单。


## 子代理

### 子代理类型
`specwf-archiver`（完整 system prompt 见 `.omp/agents/specwf-archiver.md`）

### 子代理提示词结构

派发时，提示词应包括：

```
子代理类型: specwf-archiver
描述: 归档 — delta-spec 合并、代码认知回灌、目录归档

【项目上下文】
- 读取 change 的 proposal.md、design.md、tasks.md
- 读取 delta-specs（specs/<domain>/spec.md）
- 使用 git diff 获取变更集

【本次职责】
- delta-spec 合并到全局 specs/
- 从代码变更提取行为/约束回灌
- 移动 change 目录到 archive/

【产出】
- 合并后的 specs/
- 回灌后的 specs/
- archive/<date>-<name>/ 目录
```

### 产出物

| 产出物 | 说明 | 模板参考 |
|--------|------|----------|
| `specs/<domain>/spec.md`（更新） | delta-specs 确定合并 + 代码认知回灌 | `.omp/templates/spec.md` |
| `archive/<date>-<name>/` | Change 原始产物完整归档 | 目录结构见 `.omp/agents/specwf-archiver.md` |
| `archive/INDEX.md`（追加） | 归档索引条目，含 change-id、日期、范围摘要 | — |

## 产出

| 文件/目录 | 说明 |
|-----------|------|
| `specs/<domain>/spec.md`（更新） | delta-specs 合并 + 代码认知回灌后的全局规范 |
| `archive/<date>-<name>/` | Change 原始产物（proposal.md、tasks.md、review/verification 报告等） |
| `archive/INDEX.md`（追加） | 归档索引条目，记录 change-id、日期、范围摘要 |

## 前置条件

- [ ] verify 阶段已通过（state 中 status 为 passed）
- [ ] 当前 Change 的产物完整（proposal、tasks、specs、review、verification）

## 上下文检查

```bash
specwf state
```

确认当前状态处于 verify passed 阶段，Change 信息完整无误。

## 执行

```bash
specwf archive <change-path>
```

`<change-path>` 指向 `changes/<change-name>/` 目录。

该命令依次执行：
1. **读取变更上下文** — 加载 delta-specs、全局 specs、代码 diff
2. **创建 specs 快照备份** — 备份到 `specs/.backup-<change-id>/`
3. **Delta-spec 确定性合并** — 追加/替换/删除，冲突标记 `[CONFLICT]`
4. **代码认知提取** — 从 git diff 提取隐含约束，标记 `AUTO-EXTRACTED`
5. **目录归档** — 将原始产物移动到 `archive/<date>-<name>/`
6. **更新归档索引** — 追加条目到 `archive/INDEX.md`

## 推进

归档完成后：

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```

进入 ship 阶段准备合并和发布。

## 参考技能

- `skills/specwf-archive/SKILL.md` — specwf-archiver agent 的详细操作指南、合并规则、验证标准和常见陷阱

## 参数

`specwf archive <change-path>` — `<change-path>` 指向 `changes/<change-name>/` 目录。
