# Design: 修复 CLI 参数和自动发现

## 问题

1. 命令缺少参数指定目标（milestone/phase/change），无法操作当前 scope 之外的内容
2. 无参数时 agent 不知道可以通过 CLI 获取状态和下一步
3. 缺少 `roadmap` CLI 命令
4. `state` 命令只能读不能写，无法手动切换 milestone/phase

## 修复方案

### 1. 添加 state set 子命令

```bash
specwf state set-milestone <id>     # 切换当前 milestone
specwf state set-phase <id>         # 切换当前 phase
specwf state set-step <step>        # 切换当前步骤
specwf state show                    # 同 specwf state
```

### 2. 更新命令模板——添加参数占位符

每个 slash command body 模板添加：
- 可选参数（如 `/specwf:discuss <phase-id>`）
- 无参数时的自动发现逻辑：先运行 `specwf state` + `specwf continue`，让用户确认

### 3. 更新 continue 逻辑

当 `milestone-shipped` 且无下一个 phase 时，提示用户创建新 milestone：
```
→ milestone-shipped，无可用 phase。
→ 创建新 milestone: specwf state set-milestone <id>
→ 然后继续: specwf continue
```

## 文件

| 文件 | 变更 |
|---|---|
| src/commands/specwf-state.ts | 添加 set-milestone/set-phase/set-step 子命令 |
| src/core/continue.ts | 完善无下一步时的提示 |
| src/public/templates/commands/*.md | 添加参数占位符 + 自动发现指引 |

## 验证

- specwf state set-milestone m2 -- 正确更新 state.md
- specwf continue -- 在 milestone-shipped 时提示创建新 milestone
- 命令模板包含 `$1` 参数占位符和自动发现指引
