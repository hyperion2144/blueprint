# 里程碑管理

切换或创建 Milestone，设置当前阶段。

| | |
|---|---|
| **描述** | 里程碑管理 — 切换/创建 Milestone，设置当前阶段 |
| **子代理** | 无 |
| **产出** | state.md — current_milestone 更新 |
| **上下文** | `specwf state` |
| **推进** | `specwf continue` |
| **引用技能** | `skills/specwf-milestone/SKILL.md` |

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前处于 milestone 阶段。运行 `specwf continue` 校验前置条件。

### 步骤 2：获取上下文

```bash
specwf context milestone
```

读取输出的文件清单。


## 上下文

```bash
specwf state
```

`specwf state` 显示当前 milestone 和 phase 信息。

可参考 `@specwf/roadmap.md` 查看 milestone 列表。

## 操作

```bash
# 切换到指定 milestone
specwf state set-milestone <id>

# 切换到指定 phase
specwf state set-phase <id>
```

## 下一步

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```

## 参考

技能文件：`.omp/skills/specwf-milestone/SKILL.md`
