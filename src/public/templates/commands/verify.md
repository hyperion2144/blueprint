# 测试验证

运行测试，诊断根因，路由回环。使用 specwf-verifier agent。

## 子代理

### 子代理类型

`specwf-verifier`（完整 system prompt 见 `.omp/agents/specwf-verifier.md`）

### 子代理提示词结构

派发时，提示词应包括：

```
子代理类型: specwf-verifier
描述: 测试验证 — 运行测试、诊断根因、路由回环

【项目上下文】
- 读取 change 的 tasks.md 了解完成标准
- 读取 design.md 了解技术方案
- 读取 delta-specs 了解规格约束

【本次职责】
- 运行完整测试套件
- 诊断失败根因
- 路由回环：计划缺陷→replan、实现缺陷→reapply、规格缺陷→修 spec

【产出】
- verification.md（模板: specwf template verification）
```

### 产出物

| 文件 | 模板 | 用途 |
|------|------|------|
| `VERIFICATION.md` | `specwf template artifacts/verification.md` | 测试结果、根因诊断、路由决策 |

派发 specwf-verifier 子代理，负责：
- 运行测试并收集结果
- 诊断失败根因
- 路由回环（replan/reapply）

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

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```

`specwf continue` 读取 VERIFICATION.md 的路由决策：passed 则推进到 archive，replan/reapply 则回环到对应阶段。
