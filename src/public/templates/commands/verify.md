# 测试验证

运行测试，诊断根因，路由回环。使用 specwf-verifier agent。

## 子代理

```yaml
agent: specwf-verifier
产出: change 目录下的 VERIFICATION.md
```

## 产出

| 文件 | 模板 | 用途 |
|------|------|------|
| `changes/<change-name>/VERIFICATION.md` | `specwf template artifacts/verification.md` | 测试结果、根因诊断、路由决策 |

VERIFICATION.md 包含：测试结果汇总（单元测试 + 类型检查 + 集成测试）、delta-spec 需求覆盖检查、决策覆盖检查、目标达成检查、根因诊断（计划缺陷/实现缺陷/规格缺陷/环境问题）、路由建议与回环记录。

## 上下文

```bash
specwf context verify
specwf state
```

## 回环路由

verifier 根据根因分类自动决定路由：

| 缺陷类型 | 路由 | 说明 |
|---------|------|------|
| 计划缺陷（plan） | → replan | 设计错/漏，回 plan 重设计 |
| 实现缺陷（implement） | → reapply | 代码写错，回 apply 重实现 |
| 规格缺陷（spec） | → 标记 spec 待修 | spec 本身错误，回 plan 修 spec |
| 环境问题（environment） | → 记录不路由 | 环境/依赖配置问题，标记 human-needed（如需） |

连续 2 次回环未解决问题时标记 `HUMAN_NEEDED`，防止无限回环。

## 参考

```bash
cat skills/verify.md
```

## 下一步

```bash
specwf continue
```

`specwf continue` 读取 VERIFICATION.md 的路由决策：passed 则推进到 archive，replan/reapply 则回环到对应阶段。
