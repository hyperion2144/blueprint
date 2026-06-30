# 项目技术调研

对关键技术方向进行前期调研，降低后续实现阶段的技术不确定性。并行派出多个 specwf-researcher subagent，每个 agent 独立调研一个技术方向（如框架选型、库对比、架构决策点）。调研结果合并输出到 `@specwf/research/` 目录，供 planner 在设计阶段使用。

## 子代理

### 子代理类型
`specwf-researcher`（完整 system prompt 见 `.omp/agents/specwf-researcher.md`）

### 子代理提示词结构

每个技术方向派发一个 researcher 子代理。提示词应包括：

```
子代理类型: specwf-researcher
描述: 技术调研 — 对比方案、评估可行性、产出推荐

【项目上下文】
- 从 requirements.md 提取调研范围
- 从 project.yml 提取技术约束

【本次职责】
- 对比至少 2 个候选方案
- 评估可行性和风险
- 产出推荐方案及理由

【产出】
- stack.md（模板: specwf template codebase-stack）
- 或 architecture.md（模板: specwf template codebase-architecture）
- 或 pitfalls.md（模板: specwf template codebase-pitfalls）
```

## 产出

| 文件 | 模板参考 | 用途 |
|------|----------|------|
| `@specwf/research/stack.md` | `specwf template stack` | 技术栈推荐与对比结果 |
| `@specwf/research/architecture.md` | `specwf template architecture` | 架构方案调研与选型 |
| `@specwf/research/pitfalls.md` | `specwf template pitfalls` | 已知陷阱与风险记录 |
| `@specwf/research/summary.md` | 无模板（自由格式） | 调研总结与下一步建议 |

## 上下文检查

```bash
specwf context research
specwf state
```

确认当前上下文包含：项目技术栈输入、待调研的技术方向清单、约束条件（性能要求、兼容性需求、团队熟悉度等）。

## 推进

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```

调研完成后自动进入 plan 阶段开始方案设计。如需跳过调研直接使用已知结论，执行 `specwf state set-step plan`。

## 参考技能

- `skills/specwf-research/SKILL.md` — specwf-researcher agent 的详细操作指南、输出格式规范
