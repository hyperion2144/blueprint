# 项目技术调研

对关键技术方向进行前期调研，降低后续实现阶段的技术不确定性。并行派出多个 specwf-researcher subagent，每个 agent 独立调研一个技术方向（如框架选型、库对比、架构决策点）。调研结果合并输出到 `@specwf/research/` 目录，供 planner 在设计阶段使用。

## Subagent

每个独立技术方向派出一个 `specwf-researcher` agent，通过 `task` 工具 fan-out 并行执行。

```yaml
agent: specwf-researcher
fan-out: 每个技术方向一个
产出物: 写入对应文件（stack.md / architecture.md / pitfalls.md / summary.md）
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

调研完成后自动进入 plan 阶段开始方案设计。如需跳过调研直接使用已知结论，执行 `specwf state set-step plan`。

## 参考技能

- `skills/specwf-research/SKILL.md` — specwf-researcher agent 的详细操作指南、输出格式规范
