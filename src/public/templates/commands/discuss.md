# Phase 讨论

为当前 Phase 做详细的实现决策讨论，产出 context.md。这是进入技术实现前的最后一道设计关卡，确定 Phase 的目标、范围、设计方案和实现决策。

**子代理**: 无（由主工作流直接执行）

## 上下文

查看当前 Phase 信息和项目上下文：

```bash
specwf context discuss
specwf state
```

## 产出

写入当前 phase 目录下的 `context.md`，参考模板：

```bash
specwf template artifacts/context.md
```

context.md 包含：
- Phase 目标和范围
- 架构决策（D1/D2/...）
- 接口契约和数据模型
- 实现约束
- Change 拆分方案
- 非目标和不在此 phase 做的事项

## 执行步骤

1. **确定 Phase 范围** — 回顾 roadmap.md 中当前 phase 的描述，确认输入/输出和与其他 phase 的接口边界
2. **讨论技术决策** — 逐项讨论架构决策、数据结构、异常处理、测试策略，每项达成共识后记录
3. **记录 context.md** — 将讨论结果写入 context.md，灰色地带标记 `[TODO: discuss]`
4. **拆分 Change** — 将 Phase 拆分为 1-3 个独立可交付的 Change，标注依赖关系

## 参考

完整流程指引见：

```bash
cat skills/discuss.md
```

## 下一步

完成后：

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。

```bash
# 例: 输出 → 下一步: grill
# 则执行 .omp/commands/specwf-grill.md
```
