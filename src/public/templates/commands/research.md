# 项目技术调研

对关键技术方向进行前期调研。并行派出多个 specwf-researcher 子代理，每个独立调研一个技术方向。调研结果合并输出到 `@specwf/research/` 目录，供 planner 使用。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 步骤 2：获取上下文

```bash
specwf context research
```

读取输出的文件清单。

### 步骤 3：派发子代理调研

每个技术方向派发一个 `specwf-researcher` 子代理（完整 system prompt 见 `.omp/agents/specwf-researcher.md`）。

提示词内容：

```text
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

### 步骤 4：推进

```bash
specwf continue
```

调研完成后自动进入 plan 阶段。

---

## 产出

| 文件 | 模板 | 用途 |
|------|------|------|
| research/stack.md | specwf template codebase-stack | 技术栈推荐与对比结果 |
| research/architecture.md | specwf template codebase-architecture | 架构方案调研与选型 |
| research/pitfalls.md | specwf template codebase-pitfalls | 已知陷阱与风险记录 |
| research/summary.md | 无模板（自由格式） | 调研总结 |

## 参考

技能文件：`.omp/skills/specwf-research/SKILL.md`
