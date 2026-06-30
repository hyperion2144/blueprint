# Change 拆分

将 Phase 拆分为多个独立可交付的 Change，确定依赖图和执行策略。每个 Change 是一个可独立设计、实现、审查、验证的工作单元，有明确的 proposal.md 描述其范围、接口和验收标准。

**子代理**: 无（由主工作流直接分析拆分）

## 上下文

查看当前 Phase 信息和已就位的研究产出：

```bash
specwf context split
specwf state
```

## 产出

在 `changes/` 下为每个 Change 创建目录和 proposal.md：

| 产出文件 | 模板参考 | 说明 |
|---------|---------|------|
| `changes/<name>/proposal.md` | `specwf template artifacts/proposal.md` | Change 意图、范围、方案方向、must-haves |
| `changes/<name>/specs/` | 无模板（初始空目录） | Delta-specs 目录，plan 阶段填充 |
| 依赖图 | 无模板 | 在 conversation 中记录，不生成独立文件 |

## 执行步骤

1. **识别 Change** — 将 Phase scope 拆分为若干独立可验证的功能单元，每个 Change 对应一个完整切面，不跨 Change 共享未完成代码
2. **建立依赖图** — 标注 Change 间的数据依赖、接口依赖、顺序依赖；确认无环
3. **创建目录和 proposal** — 为每个 Change 执行：

   ```bash
   mkdir -p changes/<change-name>/specs
   specwf template artifacts/proposal.md > changes/<change-name>/proposal.md
   ```

4. **配置并行策略** — 根据依赖图选择策略：
   - `serial` — 全序串行
   - `dependency-graph` — 无依赖并行、有依赖串行（默认推荐）
   - `pipeline` — 按依赖深度分层，同层并行、异层流水

## 检查清单

- [ ] 每个 Change 有明确的可验证结果
- [ ] 依赖图无循环
- [ ] Change 范围不重叠
- [ ] 所有 Phase scope 被覆盖
- [ ] 依赖关系合理（无缺少的依赖）
- [ ] 单个 Change diff 预估 ≤ 400 行

## 参考

## 参数

```
[phase <name>]
```

不传时运行 `specwf continue` 查看当前 milestone 的待处理 phase。

完整流程指引见：

```bash
cat skills/split.md
```

## 下一步

完成后进入首个 Change 的 plan 阶段：

```bash
specwf continue
```

然后根据输出的"推荐下一步"执行对应操作。
