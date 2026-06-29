---
# ============================================================
# specwf 状态机 frontmatter
# ============================================================
# 注意：这是 YAML frontmatter，缩进和空格敏感。
# 不要使用 Tab，不要混用空格缩进层级。

# 项目元信息
project:
  name: {{name}}           # 项目名，与 project.yml 一致
  status: initialized       # 项目级状态机当前步
                            #   initialized → requirements-defined → researched → roadmap-defined
                            #   → milestone-active → project-done / project-paused / project-aborted
  current_milestone: null   # 当前活跃 Milestone 名称，如 milestone-1, v2-migration
  current_phase: null       # 当前活跃 Phase 名称
                            #   如: auth-system, data-migration

# 当前活跃上下文（项目层或某个实体层）
active_context:
  type: project             # 当前上下文类型: project / milestone / phase / change / adhoc
  ref: null                 # 当前上下文的引用名称（如 phase 名称或 change ID）
  step: init                # 当前上下文所在的步骤名
                            #   项目层步: init, requirements, research, roadmap
                            #   Phase 层步: discuss, research, split, apply, review, verify, ship
                            #   Change 层步: plan, apply, review, verify, archive

# Change 层执行记录（每次 apply 时追加）
# 每个 Change 记录包含: { id, status, phase_ref, specs, tasks }
# 每项格式见下方填写指引
changes: []

# 临时/紧急变更记录（非 Change 体系的修改）
# 每项格式: { id, description, status, related_phase }
adhoc: []

# --- 前端变量说明 ---
#
# {{name}}       — 项目名称，从 project.yml 读取
# {{date}}       — 当前日期，specwf 自动填充
# {{phase-name}} — 当前 Phase 名称
# {{change-name}}— 当前 Change 名称
# {{step}}       — 当前工作流步骤名
---

# {{name}} — 状态机

## 当前位置

<!-- 简要描述当前在项目流程中的位置 -->

**项目层**: <!-- 如 "Milestone 1 — 用户认证系统实施中" -->
**当前 Milestone**: {{current_milestone | "无"}}
**当前 Phase**: {{current_phase | "无"}}
**当前 Step**: <!-- 如 "Change 'add-email-login' apply 中" -->

## 状态机

<!-- 说明当前实体层的状态机路径和可选步 -->

### 项目层状态机

```
initialized → requirements-defined → researched → roadmap-defined
    → milestone-active → project-done / project-paused / project-aborted
```

### Phase 层状态机

```
discuss → research → split → [change执行循环] → ship
                                   ↓
               plan → apply → review → verify → archive
                                    ← replan ←
                                    ← reapply ←
```

### Change 层状态机

```
planned → applying → applied → reviewing → verifying → archived
                         ↑← reapply  ←  ←  ←  ←
```

### 当前状态

- **项目状态**: {{project.status}}
- **Milestone 状态**: <!-- 如 "进行中 / 未开始 / 已完成" -->
- **Phase 状态**: <!-- 如 "discuss 完成，research 进行中" -->
- **Change 状态**: <!-- 如 "3 个 planned，2 个 applied，1 个 verifying" -->

## 变更列表 (Changes)

当前 Phase 下的所有 Change 及其状态一览。

| Change ID | 描述 | 状态 | 关联 Specs |
|-----------|------|------|------------|
| <!-- change-1 --> | <!-- 简短描述 --> | planned / applying / applied / reviewing / verifying / archived / blocked | <!-- specs 文件路径 --> |
| <!-- change-2 --> | <!-- ... --> | | |

## 临时变更 (Ad-hoc)

非 Change 体系内的暂存修改记录。

| ID | 描述 | 状态 | 关联 Phase |
|----|------|------|-----------|
| <!-- adhoc-001 --> | <!-- 做了什么/为什么是 adhoc --> | open / resolved | <!-- 影响哪个 phase --> |

## 历史

<!-- 按时间增序记录所有关键状态变更事件。每次状态变更后追加一行。 -->

- {{date | YYYY-MM-DD HH:mm}} — init: 创建 specwf 项目结构
- <!-- 后续事件追加格式: -->
- {{date}} — milestone {{milestone-name}} started
- {{date}} — phase {{phase-name}} {{old-status}} → {{new-status}}
- {{date}} — change {{change-name}} {{old-status}} → {{new-status}}

## 状态变更检查清单

每次变更状态时，请确认以下条件：

### milestone 启动前
- [ ] 前一 milestone 已 ship（或项目第一个）
- [ ] roadmap 已定义
- [ ] 资源/成员已就位

### phase 启动前
- [ ] 当前 milestone 中无冲突 phase
- [ ] 依赖的前置 phase 已完成

### phase split → apply
- [ ] 所有 Change 已定义
- [ ] Change 依赖图已确认无环
- [ ] 每个 Change 都有 spec 和 plan

### change apply → review
- [ ] 所有 task 已实现并提交
- [ ] RED→GREEN→REFACTOR 循环完整（behavior 类型）
- [ ] 类型检查通过（tsc --noEmit）
- [ ] 测试通过（vitest run）

### change review → verify
- [ ] 三重审查全部 PASS（或按 gate 配置通过）
- [ ] 无未关闭的 reapply 标记

### change verify → archive
- [ ] 验证报告已生成
- [ ] 无打开的 replan/reapply 回环
- [ ] 代码认知已提取（archive 时触发 delta-spec 合并）

### phase ship 前
- [ ] 所有 Change 已 archived
- [ ] phase summary 已生成
- [ ] 文档已更新

---

*state.md 由 specwf 自动管理。不要手动编辑 frontmatter 的缩进和层级结构。*
