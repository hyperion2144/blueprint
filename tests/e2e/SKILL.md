---
name: bp-e2e-test
description: Run end-to-end tests against the BP workflow system via OMP RPC mode. Covers the full init→grill→research→roadmap→discuss→split→plan→apply→review→verify→archive→ship chain. Use when testing BP workflow correctness, verifying template changes, or running regression tests before release.
---

# BP E2E Test

端到端测试 BP 工作流系统，通过 OMP RPC 模式驱动被测会话 (SUT)，Test Driver 负责观察、判读、调度。

## Quick start

```bash
# 1. 准备 fixture 项目
FIXTURE=~/vault/projects/specworkflow-fixture/sokoban
mkdir -p "$FIXTURE"
cd "$FIXTURE" && bp init --yes

# 2. 启动 OMP RPC
omp --mode rpc --cwd "$FIXTURE" --auto-approve --no-title --allow-home

# 3. 逐步发送命令 (参考下方 Step Protocol)
```

## 角色分离

| 角色 | 职责 | 禁止 |
|------|------|------|
| **Test Driver** (你) | 发送命令、观察事件、收集证据、写 verdict、修复模板 | 代为执行 SUT 工作 |
| **SUT** (OMP 会话) | 接收命令、执行 BP 步骤、产出 artifacts | — |

## Step Protocol

每步执行流程：

```
1. 发送 prompt (RPC stdin)
2. 收集 events 直到 agent_end (RPC stdout)
3. 处理 extension_ui_request (auto-answer 或手动回复)
4. 收集证据: git diff, bp/state.md, bp/ 文件列表
5. 写 verdict (PASS/FAIL/SKIPPED + 理由)
```

### RPC 驱动

使用 `tests/e2e/scripts/rpc-driver.py`：

```bash
python3 tests/e2e/scripts/rpc-driver.py \
  --profile bp-e2e \
  --step 01-init \
  --message "/bp-init" \
  --start  # 首次调用启动 OMP
```

驱动通过 subprocess 管理 OMP 进程，自动处理：
- `extension_ui_request` → auto-answer (select 选 recommended，confirm 确认，input 用默认值)
- `message_update` → 收集 text delta
- `message_end` → 累计 token usage
- `agent_end` → 保存结果

### 常见问题

| 问题 | 症状 | 根因 | 修复 |
|------|------|------|------|
| OMP 401 error | message_start errorStatus=401 | MINIMAX_API_KEY 未设置 | `export MINIMAX_API_KEY=...` 并重启 OMP |
| OMP 无模型 | "No models available" | 新 profile 无 models.yml | 复制 `~/.omp/agent/models.yml` 到 profile 目录 |
| agent_end 超时 | apply 步骤超 10min | 模型执行时间过长 | 增大 timeout，或使用 `--auto-approve` |
| `ask` 工具不可用 | agent 用文本提问而非 extension UI | RPC 模式下 `ask` 工具未注册 | 用文本 follow-up 回复，或检查 tool registry |

## 验证清单

每步检查项（详见 [TEST-GOAL.md](TEST-GOAL.md)）：

| 步骤 | 必查 |
|------|------|
| `/bp-init` | `bp/` 目录完整 + state.md frontmatter + 16c/7a/16s 生成 |
| `/bp-grill` | requirements.md 覆盖选题 + 已填充非空 |
| `/bp-research` | research/* 至少 1 stack + 无 TODO |
| `/bp-roadmap` | roadmap.md 含 ≥3 phase + 每 phase ≥1 change |
| `/bp-discuss` | context.md + research.md 落在 phase 目录 |
| `/bp-split` | changes/ 下 ≥1 change proposal |
| change 执行 | proposal→design→tasks→specs 完整，triple review 归档 |
| `/bp-ship` | phase summary + state 更新 |

## 已知模板问题

以下问题在本轮测试中发现，修复前会影响 E2E 结果判读：

| # | 层 | 文件 | 问题 |
|---|-----|------|------|
| P1 | TEMPLATE | `apply.ts` | "Mark all tasks as checked" → 应在逐个 task 验证后 mark |
| P2 | PROMPT | `apply.ts` | type:behavior change 未 dispatch executor 子代理 |
| P3 | ENGINE | plan 流程 | delta-spec (spec.md) 为空模板，未被填充 |
| P4 | PROMPT | review.ts | spec-review 未检测空 spec.md |
| P5 | TEMPLATE | `roadmap.ts` | MVP mode 强制 milestone-phase 嵌套导致小型项目过度拆分 |

## Fixture 选题

**推箱子 (Sokoban)** — Web/Canvas/TypeScript 纯前端。

选题理由：推箱子 = 规则引擎 (reducer) + 可视化渲染 (Canvas) + 关卡数据 (JSON) + 状态管理 (undo)，足以覆盖全链路的子能力：
- 规则引擎 → `type:behavior` change，TDD RED→GREEN→REFACTOR
- 可视化渲染 → `type:scaffolding` change，组件集成
- 关卡数据 → config + behavior 混合
- 状态管理 → behavior change，state machine

Fixture 路径：`~/vault/projects/specworkflow-fixture/sokoban`（与主项目同级隔离）

## 相关文件

- [TEST-GOAL.md](TEST-GOAL.md) — 完整测试目标与执行协议
- [TEST-REPORT.md](TEST-REPORT.md) — 最近一次测试报告
- [scripts/rpc-driver.py](scripts/rpc-driver.py) — RPC 驱动脚本
