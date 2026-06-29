# 测试验证

运行测试，诊断根因，路由回环。

## 上下文

```bash
specwf context verify
specwf state
```

## 回环路由

- 计划缺陷 → `specwf continue`（回 plan）
- 实现缺陷 → 回 apply 重实现
- 规格缺陷 → 标记 spec 待修

## 下一步

```bash
specwf continue
```
