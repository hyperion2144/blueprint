# Design: fix-continue-args

---

## 背景与目标

`specwf continue` 只读 `active_context` 推断下一步，无法查询特定 change/milestone/phase 的状态。

本设计目标：
- `specwf continue change <name>` — 查询 change/adhoc 的状态并输出下一步
- 无参数调用行为不变（向后兼容）
- milestone / phase 参数暂不实现（scope 控制）

---

## 技术方案

### 架构图

```text
specwf continue change <name>
  → continueHandler(name)
    → determineChangeNextStep(specwfDir, name)
      → loadState()
      → state.changes.find(name)
        ├─ 匹配 → status = "change-" + change.status
        └─ 未匹配 → state.adhoc.find(name)
            ├─ 匹配 → status = "adhoc-" + adhoc.status
            └─ 未匹配 → error "change 不存在"
      → getNextSteps(status)
      → format output
```

### 核心数据结构

```typescript
// 新增
interface ContinueOptions {
  target?: {
    type: 'change' | 'milestone' | 'phase';
    name: string;
  };
}
```

### 数据流

1. 用户在终端输入 `specwf continue change fix-ship-command`
2. commander 解析参数 → `continueHandler('change', 'fix-ship-command')`
3. `loadState(specwfDir)` 读取 state.md
4. 在 `state.changes` 中查找 `fix-ship-command` → 未找到
5. 在 `state.adhoc` 中查找 `fix-ship-command` → 找到，status = `proposal`
6. 构造状态键: `${contextType}-${status}` = `adhoc-proposal`
7. `getNextSteps('adhoc-proposal')` → 返回 `[{ command: 'plan', ... }]`
8. 格式化输出：与现有 continue 输出格式一致，但 context 行显示 change 名称

### 接口设计

```typescript
// src/core/continue.ts — 新增函数
function determineChangeNextStep(
  specwfDir: string,
  changeName: string,
): ContinueResult | { error: string }

// src/commands/specwf-continue.ts — 修改
// 注册子命令: continue change <name>
// 无参数: 调用原来的 determineNextStep
// 有参数: 调用 determineChangeNextStep
```

---

## 文件清单

| 文件路径 | 内容描述 | 操作 |
|---------|---------|------|
| `src/commands/specwf-continue.ts` | 添加子命令解析（change 子命令） | 修改 |
| `src/core/continue.ts` | 新增 `determineChangeNextStep` 函数 | 修改 |

---

## 测试策略

### 单元测试
- `determineChangeNextStep` 对 adhoc change 返回正确的下一步
- `determineChangeNextStep` 对不存在的 change 返回 error
- 无参数调用行为不变

### 集成测试
- `specwf continue change fix-ship-command` → 输出 proposal 状态的下一步（plan）

### TDD 任务
- `determineChangeNextStep` 的单元测试走 RED→GREEN→REFACTOR

---

## 备选方案

| 方案 | 优点 | 缺点 | 不选原因 |
|-----|------|------|---------|
| **统一所有实体到一个命令** | 一个接口查所有 | 实现复杂 | 拆分子命令更清晰易维护 |
| **只查 adhoc 不查 changes** | 更简单 | 只解决当前问题 | change 查询也是合理需求 |

---

## 风险点

| 风险 | 概率 | 影响 | 缓解措施 |
|-----|------|------|---------|
| 用户输入 change 名拼错 | 低 | 低 | 输出可用 change 列表提示 |
| 无参数时 behavior change | 低 | 高 | 确保无参数路径完全不变 |
