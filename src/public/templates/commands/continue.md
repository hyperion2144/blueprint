# 自动推进

读取 `@specwf/state.md`，根据状态机当前位置自动确定下一步操作并输出建议。

| | |
|---|---|
| **描述** | 自动推进 — 读取 state.md 确定下一步并输出执行建议 |
| **子代理** | 无需（根据 state.md 状态机自动判断） |
| **产出** | 控制台输出：当前位置 · 当前步骤 · 下一步命令 · Slash 命令 · 是否需要子代理 · 无下一步时的引导提示 |
| **上下文** | `specwf state` |
| **推进** | `specwf continue` · `specwf continue change &lt;name&gt;` |
| **引用技能** | `skills/specwf-continue/SKILL.md` |

## 用法

```bash
# 从当前 active_context 推断下一步
specwf continue

# 查询指定 change 的下一步
specwf continue change <name>
```

CLI 自动输出：
- 当前位置
- 当前步骤
- 推荐下一步命令
- Slash 命令（如有）
- 是否需要子代理
- 无下一步时的引导提示

## 上下文

```bash
specwf state
```
