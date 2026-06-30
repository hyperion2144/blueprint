# Change 拆分

将 Phase 拆分为多个独立可交付的 Change，每个 Change 有明确的 proposal.md 描述范围、接口和验收标准。

---

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

输出当前所在的 Phase 名称及其状态。确认当前在要拆分的 Phase 上，且状态允许拆分操作（通常为 `research_done` 或 `ready`）。

### 步骤 2：获取上下文

```bash
specwf context split
```

读取 **context.md**（Phase 的决策记录和设计约束）和 **research.md**（技术调研产出），理解 Phase 的全貌、技术选型、已知约束和风险点。

### 步骤 3：执行拆分

将 Phase scope 拆分为若干独立可验证的 Change，每个 Change 对应一个完整的功能切面。不跨 Change 共享未完成代码。

为每个 Change 执行：

```bash
mkdir -p changes/<change-name>/specs
specwf template artifacts/proposal.md > changes/<change-name>/proposal.md
```

在创建 proposal.md 时填写以下内容：
- **Change 意图** — 该 Change 要交付什么
- **方案方向** — 技术实现思路
- **范围** — 包含和不包含的内容
- **must-haves** — 必须完成的验收条件
- **依赖** — 对其它 Change 的前置依赖

同时标注 Change 间的依赖图（数据依赖、接口依赖、顺序依赖），确保无循环依赖。

### 步骤 4：推进

```bash
specwf continue
```

`specwf continue` 确认拆分完成，将工作流推进到首个 Change 的 plan 阶段，进入第一个 Change 的详细设计。

---

## 参数

```
[phase <name>]
```

不传时运行 `specwf continue` 查看当前 milestone 的待处理 phase。

---

## 产出

| 文件 | 说明 | 模板 |
|------|------|------|
| `changes/<name>/proposal.md` | Change 意图、范围、方案方向、must-haves | `specwf template artifacts/proposal.md` |
| `changes/<name>/specs/` | Delta-specs 目录，plan 阶段填充 | 无模板（初始空目录） |
| 依赖图 | Change 间的数据、接口、顺序依赖关系 | 无模板（在 conversation 中记录，不生成独立文件） |

---

## 检查清单

- [ ] 每个 Change 有明确的可验证结果
- [ ] 依赖图无循环
- [ ] Change 范围不重叠
- [ ] 所有 Phase scope 被覆盖
- [ ] 依赖关系合理（无缺少的依赖）
- [ ] 单个 Change diff 预估 ≤ 400 行
