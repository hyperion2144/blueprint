# 路线图拆分

将项目拆分为 Milestone x Phase 两级规划。Milestone 是长期里程碑（通常 1-3 个月），每个包含一组 Phase；Phase 是 Milestone 内的开发阶段（通常 1-2 周，产出可演示的增量）。

---

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前项目处于路线图拆分阶段。检查输出中无未完成的前置阻塞项，且 requirements.md 已就绪。

### 步骤 2：获取上下文

```bash
specwf context roadmap
```

阅读以下内容：
- `specwf/requirements.md` — 需求范围与功能列表，作为拆分依据
- `specwf/research/` — （如有）技术调研结果，指导技术栈和阶段拆分

### 步骤 3：定义 Milestone 和 Phase

与用户一起完成以下工作：

**3.1 定义 Milestone**

按功能领域或发布节奏划分里程碑。每个里程碑记录：

| 属性 | 说明 | 示例 |
|------|------|------|
| **ID** | 简短标识 | `M1-core` |
| **目标** | 一句话描述里程碑目标 | 搭建基础 CLI 框架 + spec 管理系统 |
| **范围** | 包含和不包含的功能 | 完整 specwf 循环（init→archive） |
| **成功标准** | 可测量的完成条件 | CLI 可通过所有 E2E 测试 |
| **预估时长** | 1-3 个月 | 6 周 |

**3.2 为每个 Milestone 拆分 Phase**

每个里程碑包含 3-8 个 Phase：

```
<ms-name>
├── ph.1 基础搭建
├── ph.2 核心功能 A
├── ph.3 核心功能 B
├── ph.4 集成测试
└── ph.5 文档和完善
```

每个 Phase 定义完整的元信息：

| 属性 | 说明 | 示例 |
|------|------|------|
| **ID** | `ph.N-<name>` | `ph.1-foundation` |
| **目标** | 本 Phase 产出什么 | 搭建项目骨架和 CI 基础 |
| **依赖** | 前置 Phase 或外部依赖 | `无` 或 `ph.1` |
| **输入** | specs、conventions、设计文档 | `specwf/specs/cli/spec.md` |
| **输出** | 代码、specs 更新、文档 | 可运行的命令行初始版本 |
| **预估 Change 数** | 包含几个 Change | 3 |

**3.3 验证里程碑覆盖**

- 所有功能范围已被 Milestone 和 Phase 覆盖，无遗漏
- Phase 之间的依赖关系合理，不形成循环依赖
- 每个 Phase 有可验证的成功标准
- 路线图总 Phase 数合理（3-15 个）
- 第一个 Phase 是最小可行路径（不是最复杂的部分）

**3.4 写入 roadmap.md**

产出 `specwf/roadmap.md`，推荐格式：

```markdown
# <项目> 路线图

## Milestone 概览

| Milestone | 目标 | Phase 数 | 时长 |
|-----------|------|----------|------|
| M1 — Core | CLI 框架 | 5 | 6w |

## M1 — Core Infrastructure

搭建基础 CLI 框架 + spec 管理系统。

### Phase 列表

| Phase | 目标 | 依赖 | 预估 Change 数 |
|-------|------|------|----------------|
| ph.1  |      | 无   |               |

### ph.1 <名称>

详细说明、关键决策、注意事项。
```

### 步骤 4：推进

```bash
# 切换到第一个 Milestone（多里程碑项目）
specwf state set-milestone <id>

# 或直接推进（单里程碑项目，状态机会自动读 roadmap.md）
specwf continue
```

- `specwf state set-milestone <id>` 记录当前正在工作的里程碑，状态机据此筛选后续 Phase
- `specwf continue` 检查 roadmap.md 已就绪、里程碑已设定，然后推进到下一阶段（plan）

---

## 产出

| 文件 | 说明 | 模板 |
|------|------|------|
| `specwf/roadmap.md` | 完整路线图文档 | 无模板（手动编写，参考上述推荐格式） |
