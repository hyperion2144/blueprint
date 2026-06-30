# Phase 讨论

为当前 Phase 做详细的实现决策讨论，产出 context.md。确定 Phase 的目标、范围、设计方案和实现决策。

---

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前处于 `discuss` 阶段。如果不是，运行 `specwf continue` 推进。

```bash
specwf continue
```

### 步骤 2：获取上下文

```bash
specwf context discuss
```

读取以下文件：
- `@specwf/roadmap.md` — 当前 Phase 的描述和边界
- `@specwf/project.yml` — 项目配置

### 步骤 3：讨论并记录决策

与用户逐项讨论以下内容，每项达成共识后写入 `context.md`：

```bash
specwf template artifacts/context.md > milestones/<ms>/phases/<ph>/context.md
```

context.md 包含：
- **Phase 目标** — 本 Phase 交付什么
- **架构决策（D1/D2/...）** — 每项决策编号记录
- **接口契约** — 关键接口和数据模型
- **实现约束** — 技术约束和限制
- **Change 拆分方案** — 初步拆分思路
- **非目标** — 不在此 Phase 做的事项

灰色地带标记 `[TODO: discuss]`。

### 步骤 4：推进

```bash
specwf continue
```

continue 检查 context.md 存在后，推进到 research-phase。

---

## 参数

```
[phase <name>]
```

不传时查看当前 milestone 的待处理 phase。

## 产出

| 文件 | 说明 | 模板 |
|------|------|------|
| `milestones/<ms>/phases/<ph>/context.md` | Phase 实现决策 | `specwf template artifacts/context.md` |

## 参考

技能文件：`.omp/skills/specwf-discuss/SKILL.md`
