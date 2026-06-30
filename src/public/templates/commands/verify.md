# 测试验证

运行测试，诊断根因，路由回环。使用 specwf-verifier agent。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 步骤 2：获取上下文

```bash
specwf context verify
```

读取输出的文件清单。


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
