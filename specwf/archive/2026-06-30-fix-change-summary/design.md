# Design: fix-change-summary

> **填表指引**：本文档是 Change Design，在 proposal 批准后编写，描述如何实现。每节均附填写指引，请按指引填写。写完此文档后进入 tasks 拆分解段。

---

## 背景与目标

<!--
填写指引：
1. 简要描述背景——什么上下文？有什么约束？
2. 本设计的核心目标是什么？不超过 3 条。
3. 与 proposal 中的 Intent 和 Must-haves 保持一致。

示例：
当前 FlatList 在 1000+ 条数据场景下帧率降至 20fps。
本设计目标是：
- 通过 getItemLayout + 固定行高将帧率恢复至 55fps+
- 新增滚动性能监控，为后续优化提供数据依据
- 不改变现有数据获取和渲染逻辑
-->

{{background-and-goals}}

---

## 技术方案

### 架构图

<!--
填写指引：
用 ASCII art 绘制模块/组件关系图，展示：
- 新增模块与现有模块的关系
- 数据流方向（用箭头标注）
- 文件/模块边界

示例：
```
┌─────────────────────────────────────────────────┐
│                   页面层                         │
│  ┌──────────┐    ┌──────────────────┐           │
│  │ PageHome │───>│ OptimizedList    │           │
│  │          │    │  (新增 wrapper)   │           │
│  └──────────┘    └────────┬─────────┘           │
│                           │                      │
│                    ┌──────▼─────────┐            │
│                    │ useScrollPerf  │            │
│                    │ (新增 hook)     │            │
│                    └──────┬─────────┘            │
└───────────────────────────┼──────────────────────┘
                            │
                  ┌─────────▼─────────┐
                  │   Performance     │
                  │   Reporter        │
                  │   (已有, 扩展)     │
                  └───────────────────┘
```

绘图原则：
- 方框标注模块/文件/组件
- 箭头标注数据流或控制流
- 标注"新增"、"修改"、"已有"区分
-->

```text
{{architecture-diagram}}
```

### 核心数据结构

<!--
填写指引：
列出本设计新增或修改的关键类型/接口/数据结构定义。
用 TypeScript 接口格式展示。每个类型附简要说明。

格式示例：
```typescript
// 列表配置接口（新增）
interface ListOptimizationConfig {
  /** 固定行高，单位 px。设此值启用 getItemLayout */
  itemHeight?: number;
  /** 可见窗口外预渲染的行数（默认 10） */
  windowSize?: number;
  /** 是否启用滚动性能采集 */
  enableScrollMetrics?: boolean;
}

// 滚动性能快照（新增）
interface ScrollPerfSnapshot {
  avgFps: number;
  droppedFrames: number;
  totalFrames: number;
  scrollDistance: number;
  timestamp: number;
}
```
-->

{{data-structures}}

### 数据流

<!--
填写指引：
用步骤式描述说明数据如何流转。从触发源头到最终效果，每一步写清。

格式示例：
1. 用户下拉列表 → FlatList 触发 onScroll
2. OptimizedList 读取 itemHeight 配置 → 启用 getItemLayout
3. 布局引擎跳过动态测量 → 直接使用固定行高计算 offset
4. useScrollPerformance 每 500ms 采集一次帧率
5. 帧率数据 → Performance Reporter → 上报后端
6. 渲染线程不再因布局计算阻塞 → 帧率恢复
-->

{{data-flow}}

### 接口设计

<!--
填写指引：
列出本设计对外暴露的 API 签名，包括：
- 函数/方法名
- 参数列表（名称 + 类型 + 说明）
- 返回值类型
- 是否 async/sync

格式示例：

```typescript
// OptimizedList 组件 props
interface OptimizedListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  /** 固定行高（px），必填以启用 getItemLayout */
  itemHeight: number;
  /** 窗口外预渲染行数（可选，默认 10） */
  windowSize?: number;
  /** 启用滚动性能采集（可选，默认 false） */
  enableScrollMetrics?: boolean;
  /** 滚动性能回调（可选） */
  onPerfSnapshot?: (snapshot: ScrollPerfSnapshot) => void;
}

// useScrollPerformance hook
function useScrollPerformance(
  listRef: React.RefObject<FlatList>,
  options?: { intervalMs?: number }
): { avgFps: number; isJanking: boolean };
```
-->

{{api-signatures}}

---

## 文件清单

<!--
填写指引：
列出所有需创建或修改的文件，用表格组织。
-->

| 文件路径 | 内容描述 | 操作 |
|---|---|---|
| `{{file-path-1}}` | {{description}} | 创建 |
| `{{file-path-2}}` | {{description}} | 修改 |
| `{{file-path-3}}` | {{description}} | 创建 |

---

## 测试策略

<!--
填写指引：
按测试层次描述覆盖范围。不需要写具体用例——tasks 文件负责拆解。
-->

### 单元测试
- <!-- 哪些模块需要单元测试？需要 mock 什么？ -->

### 集成测试
- <!-- 哪些流程需要集成测试？需要准备什么 fixture？ -->

### TDD 任务
- <!-- 列出需要走 RED→GREEN→REFACTOR 的 type:behavior 任务 -->

---

## 备选方案

<!--
填写指引：
列出评估过但未选择的方案，说明为什么放弃。

| 方案 | 优点 | 缺点 | 不选原因 |
|---|---|---|---|
| {{方案 A}} | {{优点}} | {{缺点}} | {{原因}} |
| {{方案 B}} | {{优点}} | {{缺点}} | {{原因}} |
-->

| 方案 | 优点 | 缺点 | 不选原因 |
|---|---|---|---|
| {{alt-name-1}} | {{pros}} | {{cons}} | {{reason}} |
| {{alt-name-2}} | {{pros}} | {{cons}} | {{reason}} |

---

## 风险点

<!--
填写指引：
识别实现风险并评估影响。

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| {{风险描述}} | 高/中/低 | 高/中/低 | {{措施}} |
-->

| 风险 | 概率 | 影响 | 缓解措施 |
|---|---|---|---|
| {{risk-1}} | {{probability}} | {{impact}} | {{mitigation}} |
| {{risk-2}} | {{probability}} | {{impact}} | {{mitigation}} |
