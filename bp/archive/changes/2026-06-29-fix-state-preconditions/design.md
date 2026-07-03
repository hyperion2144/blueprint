# Design: fix-state-preconditions

---

## 背景与目标

状态转移命令（set-step / set-milestone / set-phase）没有任何前置校验，可以随意推进状态即使必要文档不存在或还是模板空壳。OMP command 也没有指引 agent 使用 CLI 推进状态。

本设计目标：
- 新增 `src/core/state-validator.ts` 模块，校验状态转移前置条件
- 所有状态推进命令集成校验
- OMP command 模板更新"下一步"指引

---

## 技术方案

### 架构图

```text
blueprint state set-step <step>
  → validateTransition(currentStatus, nextStep, blueprintDir)
    → 查规则表匹配 (from, to)
    → 逐条检查前置条件
    ├─ 全部通过 → updateState() → 状态推进
    └─ 有失败 → 输出错误列表，不修改状态

blueprint state set-milestone <id>
  → 检查 roadmap.md 中该 milestone 已定义
  → 失败则报错

blueprint state set-phase <id>
  → 检查 roadmap.md 中该 phase 已定义
  → 检查前置 milestone/phases 已完成
  → 失败则报错
```

### 核心数据结构

```typescript
interface ValidationRule {
  from: string;           // 当前状态
  to: string;             // 目标状态  
  checks: Check[];        // 校验项
}

interface Check {
  type: 'file-exists' | 'file-not-template' | 'dir-not-empty' | 'content-contains';
  path: string;           // 相对 blueprint 目录的路径
  description: string;    // 校验说明（用于错误消息）
  expected?: string[];    // content-contains 的期望内容
}
```

### 校验规则表

| from | to | 校验项 |
|------|----|--------|
| milestone-active | requirements-defined | requirements.md 存在 + 不含 `{{` |
| requirements-defined | researching | requirements.md 存在 + research/ 目录为空（首次可跳过） |
| researching | researched | research/summary.md 存在 + 不含 `{{` |
| researched | roadmap-defined | roadmap.md 存在 + 不含 `{{` + 含 `## Phase` |
| roadmap-defined | phase-discuss | roadmap.md 中当前 milestone 有 phase 定义 |
| phase-discuss | phase-research | context.md 存在 + 不含 `{{` |
| phase-research | phase-split | research.md 存在 + 不含 `{{` |
| phase-split | change-planning | changes 已拆分 |
| change-planning | change-applying | design.md + tasks.md 存在且不含 `{{` |
| change-applying | change-reviewing | 代码已提交 |
| change-reviewing | change-verifying | REVIEW.md 存在 |
| change-verifying | change-archiving | VERIFICATION.md 存在 |
| adhoc-proposal | change-planning | proposal.md 存在 + 不含 `{{` |

### 接口设计

```typescript
// src/core/state-validator.ts
function validateTransition(
  currentStatus: string,
  nextStep: string,
  blueprintDir: string,
): { valid: boolean; errors: string[] }
```

### 修改文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/core/state-validator.ts` | 创建 | 校验规则表 + validateTransition 函数 |
| `src/commands/blueprint-state.ts` | 修改 | set-step/set-milestone/set-phase 集成校验 |
| `src/public/templates/commands/*.md` | 修改 | 所有 command "下一步"增加 CLI 推进指引 |

---

## 测试策略

### 单元测试
- `validateTransition` 对非法转移返回 valid=false + 具体错误
- 文件不存在场景
- 文件为模板空壳场景（含 `{{`）

### 集成测试
- `blueprint state set-step discuss` 当 requirements.md 不存在时报错
- `blueprint state set-step discuss` 当 requirements.md 正常时通过

---

## 备选方案

| 方案 | 优点 | 缺点 |
|------|------|------|
| **校验写在各个命令里** | 改动分散 | 重复代码，规则不一致 |
| **独立的 validator 模块**（选择） | 规则集中管理，可测试 | 需要额外文件 |

---

## 风险点

| 风险 | 概率 | 影响 | 缓解 |
|------|------|------|------|
| 校验规则过严阻塞正常流程 | 中 | 中 | 错误信息提示缺失项，不阻塞 |
| 模板检测误判（合法 `{{` 内容） | 低 | 低 | 只检查模板文件，不检查用户已填写的 |
