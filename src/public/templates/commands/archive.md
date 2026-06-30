# 归档

将 delta-specs 确定性合并到全局 specs/，从代码 diff 提取新行为和约束回灌，将原始产物移动到 `archive/`。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 步骤 2：获取上下文

```bash
specwf context archive
```

读取输出的文件清单。

前置条件：
- [ ] verify 阶段已通过（state 中 status 为 passed）
- [ ] 当前 Change 的产物完整（proposal、tasks、specs、review、verification）

### 步骤 3：派发子代理执行

参数：`specwf archive <change-path>`（`<change-path>` 指向 `changes/<change-name>/` 目录）

派发 `specwf-archiver` 子代理（完整 system prompt 见 `.omp/agents/specwf-archiver.md`，技能详见 `.omp/skills/specwf-archive/SKILL.md`）。

提示词内容：

```text
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
```

执行命令：

```bash
specwf archive <change-path>
```

`<change-path>` 指向 `changes/<change-name>/` 目录。该命令自动执行：
1. 读取变更上下文
2. 创建 specs 快照备份
3. Delta-spec 确定性合并
4. 代码认知提取回灌
5. 目录归档到 `archive/<date>-<name>/`
6. 更新归档索引

### 步骤 4：查看产出

| 文件/目录 | 说明 |
|-----------|------|
| specs/<domain>/spec.md（更新） | delta-specs 合并 + 代码认知回灌后的全局规范 |
| archive/<date>-<name>/ | Change 原始产物完整归档 |
| archive/INDEX.md（追加） | 归档索引条目 |

### 步骤 5：推进

```bash
specwf continue
```

进入 ship 阶段准备合并和发布。
