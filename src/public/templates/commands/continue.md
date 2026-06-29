# 自动推进

读 @specwf/state.md → 状态机确定下一步 → 自动执行。

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
