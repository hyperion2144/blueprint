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

### 步骤 3：派发子代理验证

参数：`change <name>`（不传时查看 `specwf state` 待处理列表）

派发 `specwf-verifier` 子代理（完整 system prompt 见 `.omp/agents/specwf-verifier.md`，技能详见 `.omp/skills/specwf-verify/SKILL.md`）。

提示词内容：

```text
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

**回环路由**：根据根因分类决定：
- 计划缺陷 → replan
- 实现缺陷 → reapply
- 规格缺陷 → 标记 spec 待修
- 环境问题 → 记录不路由

### 步骤 4：查看产出

| 文件 | 模板 |
|------|------|
| changes/<change-name>/VERIFICATION.md | specwf template verification |

### 步骤 5：推进

```bash
specwf continue
```

passed 则推进到 archive，replan/reapply 则回环到对应阶段。
