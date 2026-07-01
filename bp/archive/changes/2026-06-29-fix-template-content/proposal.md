# Proposal: fix-template-content

> **填表指引**：本文档是 Change Proposal，用于在实现前对齐变更的意图、范围和方案。每节均附填写指引，请按指引完整填写。完成后约 1-3 位 reviewer 会评审本 proposal 后再进入 design 阶段。

---

## Intent

<!--
填写指引：
说明为什么要做这个变更，回答以下问题：
1. 当前系统存在什么具体问题或缺失什么能力？
2. 这个问题影响谁（用户/开发者/运维）？影响程度如何？
3. 不做这个变更会有什么后果？
4. 这个是 bug fix / feature / tech debt / perf improvement？
5. 是否关联某个已知 issue、用户反馈、或性能指标？（可附 issue 链接）

示例：
用户反馈在列表页滑动时出现明显卡顿（60fps→20fps），经 profiling
定位为 FlatList 未配置 getItemLayout 导致布局计算 O(n²)。
本变更为性能修复，目标是将列表滚动帧率恢复至 55fps+。
-->

{{intent}}

---

## Scope

<!--
填写指引：明确界定"做什么"和"不做什么"。
-->

### In scope

<!--
列出本变更涵盖的所有功能点或改动项。
每项一行，用动词开头描述具体变更。

格式示例：
- 在列表页下拉刷新时增加骨架屏加载状态
- 新增 `useScrollPerformance` hook，提供 scroll metrics 采集
- 为 `<UserCard>` 组件添加 memo + 纯组件优化
-->

{{in-scope-items}}

### Out of scope

<!--
明确排除的改动，防止 scope creep。
每项一行，说明为什么不在本次做。

格式示例：
- 首页的骨架屏改造（已规划在下一 phase 处理）
- 服务端 API 分页改造（与客户端性能问题无关）
- Android 端列表性能优化（platform-specific，需单独调研）
-->

{{out-of-scope-items}}

---

## Approach

<!--
填写指引：从宏观描述技术方案方向，涵盖以下方面：
1. **架构方向**：改动落在哪一层（UI / ViewModel / Service / Store）？是否需要新建模块？
2. **关键库选型**：是否引入新依赖？替换或升级现有依赖？选择理由？
3. **数据流方向**：数据如何从源头到达 UI？状态管理变更？
4. **兼容性**：向后兼容策略？是否需要 migration？
5. **可测试性**：方案中是否为测试留有入口（依赖注入 / mock 点）？

不需要在此写详细实现——design 文档负责。这里写"方向"即可。

示例：
- UI 层：在 FlatList 组件外层封装 OptimizedList，内部配置 getItemLayout
  和 windowSize；ViewModel 层新增列表性能监控数据上报点
- 后端接口：不涉及，所有数据流不变
- 测试策略：新增 useScrollPerformance 单元测试 + 列表渲染性能 benchmark
-->

{{approach}}

---

## Must-haves

<!--
列出 3-7 条可观测、可验证的必须达成的行为。
每条必须是具体声明，不模糊。
写完后 reviewer 应能用这些条件判断是否通过。

填写指引：
- 每行以 "MUST" / "SHALL" 开头（英文）或 "必须" 开头（中文）
- 可观测：打开页面能看到，终端命令可检查，测试可断言
- 可验证：reviwer 能通过操作/命令确认

示例：
- 列表页滚动帧率在 1000 条数据下不低于 55fps
- 下拉刷新时骨架屏在 200ms 内显示
- 新增 useScrollPerformance 的单元测试覆盖率达到 90%+
-->

{{must-haves}}

---

## Non-goals

<!--
明确非目标，防止 reviewer 误判"为什么没做某事"。
每项一行。

不同于 Out of scope（不在此 change 的范围内），
Non-goals 是可能被误以为在范围内但明确不做的具体目标。

示例：
- 不追求 Android 端列表性能在本 change 中提升
- 不改变现有列表的分页逻辑
- 不新增 UI 组件库依赖
-->

{{non-goals}}
