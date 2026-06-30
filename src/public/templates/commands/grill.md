# 需求探讨

通过逐条提问收集需求，与用户深入探讨项目目标、范围、约束和技术方向，直到所有需求细节达成共识。Grill 阶段不写代码——它的产出是一份结构化的 `requirements.md`，供后续 research 和 roadmap 阶段使用。

## 子代理

无。本步骤由主 agent 直接与用户交互完成。

## 产出

| 产出文件 | 模板 | 说明 |
|---------|------|------|
| `@specwf/requirements.md` | 无模板（自由格式 Markdown） | 需求共识文档 |

requirements.md 自由格式，但建议包含以下章节：
- **概述** — 项目核心目标
- **5W1H 需求** — What/Why/Who/When/Where/How 逐项记录
- **用户角色** — 目标用户及其职责
- **功能范围**（含排除项）— 做什么、不做什么
- **非功能需求** — 性能、安全、合规、部署
- **技术倾向** — 偏好技术栈、开发流程要求
- **风险与不确定性** — 已知风险和未决问题
- **核心决策清单** — 所有已达成共识的决策条目

## 上下文检查

```bash
specwf context grill
specwf state
```

`specwf context grill` 输出当前项目上下文和已有需求概况，`specwf state` 显示状态机当前位置。

可参考：
@specwf/project.md
@specwf/requirements.md

## 方法

按 5W1H 框架逐层深入提问：

1. **理解背景** — 项目核心目标、目标用户、当前状态（从零/改进/重构）
2. **深挖细节** — 对每个模糊点持续追问直到边界清晰：
   - **What** — 具体功能、输入输出、排除范围
   - **Why** — 业务驱动力、必须满足的约束
   - **Who** — 用户角色和权限、维护者技术栈
   - **When** — 时间线、最小可用范围
   - **Where** — 部署环境、已有基础设施
   - **How** — 技术栈倾向、开发流程要求
3. **整理共识** — 将讨论结果写入 `requirements.md`
4. **确认共识** — 与用户逐项回顾，确保无歧义

## 下一步

完成后，确认用户对 requirements.md 所有条目无异议：

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```

`specwf continue` 将读取 state.md，状态机推进到下一阶段（research）。

## 参考

技能文件：`.omp/skills/specwf-grill/SKILL.md`
