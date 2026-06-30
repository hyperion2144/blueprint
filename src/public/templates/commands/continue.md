# 自动推进

读取 `@specwf/state.md`，根据状态机当前位置确定下一步操作。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

查看当前状态机位置。

### 步骤 2：执行推进

```bash
specwf continue
```

CLI 自动执行：
1. 校验当前步骤退出条件（文件存在且非模板）
2. 校验通过 → 更新状态机到下一步
3. 校验失败 → 输出缺失项，不推进

输出格式：

```
当前位置: <当前上下文>
当前步骤: <当前步骤>

→ 下一步: <命令>
   Slash 命令: <slash>
   描述: <说明>
   产出物: <文件列表>
   参考: .omp/commands/specwf-xxx.md

# 然后你必须执行参考文件中的工作
```

### 步骤 3：根据输出执行

收到输出后，严格按照以下规则执行：

| 输出内容 | 执行动作 |
|---------|---------|
| `下一步: grill` | 打开 `.omp/commands/specwf-grill.md`，按描述执行 |
| `下一步: research` | 打开 `.omp/commands/specwf-research.md`，派发 researcher |
| `下一步: roadmap` | 打开 `.omp/commands/specwf-roadmap.md`，拆分路线图 |
| `下一步: discuss` | 打开 `.omp/commands/specwf-discuss.md`，讨论 Phase |
| `下一步: research-phase` | 打开 `.omp/commands/specwf-research-phase.md`，派发 phase-researcher |
| `下一步: split` | 打开 `.omp/commands/specwf-split.md`，拆分 Change |
| `下一步: plan` | 打开 `.omp/commands/specwf-plan.md`，派发 planner |
| `下一步: apply` | 打开 `.omp/commands/specwf-apply.md`，派发 executor |
| `下一步: review` | 打开 `.omp/commands/specwf-review.md`，派发 reviewer |
| `下一步: verify` | 打开 `.omp/commands/specwf-verify.md`，派发 verifier |
| `下一步: archive` | 打开 `.omp/commands/specwf-archive.md`，派发 archiver |
| `下一步: ship-phase` | 打开 `.omp/commands/specwf-ship.md`，创建 PR |
| `下一步: ship-milestone` | 打开 `.omp/commands/specwf-ship.md`，打 release tag |
| `需子代理: 是` | 派发对应 specwf-xxx 子代理 |
| `无可用下一步` | 停止，输出提示信息 |

**重要：看到"下一步"就必须执行对应命令。不允许只打印不执行。**

### 步骤 4：查询特定 change

```bash
specwf continue change <change-name>
```

输出后同样根据"推荐下一步"执行对应操作。
