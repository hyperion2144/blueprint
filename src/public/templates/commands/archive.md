# 归档

Change 循环的收尾阶段。负责三件事：(1) 将 delta-specs 确定性合并到全局 specs/；(2) 从代码 diff 中提取新的行为和约束，回灌到 specs/ 中；(3) 将原始产物目录移动到 `archive/<date>-<name>/` 下持久保存。归档完成后，Change 的工作永久记录在 specs/ 和 archive/ 中，供后续 Change 参考和追溯。

## Subagent

通过 `task` 工具派出 `specwf-archiver` subagent 执行归档：

```yaml
agent: specwf-archiver
change-path: <change-name>
产出物: specs/（合并后）、archive/<date>-<name>/（原始产物归档）
```

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

进入 ship 阶段准备合并和发布。

## 参考技能

- `skills/specwf-archive/SKILL.md` — specwf-archiver agent 的详细操作指南、合并规则、验证标准和常见陷阱
