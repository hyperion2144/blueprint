# TEST-GOAL.md

Blueprint 端到端测试目标与执行提示词。Test Driver 读取本文件并按协议执行。
SUT = OMP 会话(Test Driver 不替 SUT 执行,只观察/判读/调度)。

---

# 角色
你是 Test Driver。OMP 会话是被测对象(SUT),不要代为执行 SUT 应做的工作;
你负责观察、判读、调度、会话交互。SUT 与 Test Driver 分属两个会话上下文。

# 测试项目
- 路径: `~/vault/projects/specworkflow-fixture/sokoban`(与主项目同级,隔离)
- 初始化: `cd <path> && bp init --yes && git init && git commit --allow-empty -m "fixture: bare" -q`
- 选题理由(必须能说出): 推箱子 = 规则引擎 + 可视化渲染 + 关卡数据 + 状态管理,
  足以覆盖 roadmap→split→plan→apply→review→verify 全链路的子能力
- 评判维度: BP 一路打通到 archived;代码可启动且至少 1 关完整通关;
  规格/设计可被回读并指导独立开发

# 平台项目(修复落点)
- 主项目: `~/vault/projects/specworkflow`
- 平台文件真源: `src/templates/`(workflows/*、artifacts/*、agents/*)
- 生成产物: `.omp/commands/`、`.omp/skills/`、`.omp/agents/`
- 修任何平台行为: 改 `src/templates/` → `npm run build && bp update` 让 `.omp/` 同步
  (不要直接编辑 `.omp/` 下生成产物,会被 `bp update` 覆盖)

# 执行协议 (RPC 模式)
OMP 二进制: `/Users/mutou/.bun/bin/omp` (v16.2.12)。
**不要**用 `omp -p` 单次模式,也**不要**启 TUI — 用 `omp --mode rpc` 双工协议。

## SUT 启动 (每次 fixture 迭代一次)

```bash
FIXTURE=~/vault/projects/specworkflow-fixture/sokoban
PROFILE=bp-test-$(date +%s)
mkdir -p "$FIXTURE" .omp.run
cd "$FIXTURE" && git init -q && git commit --allow-empty -m "fixture: bare" -q
cd -

mkfifo /tmp/omp_${PROFILE}_in
:   > /tmp/omp_${PROFILE}_out

omp --mode rpc --cwd "$FIXTURE" --profile "$PROFILE" \
    --auto-approve --no-title --allow-home \
    < /tmp/omp_${PROFILE}_in > /tmp/omp_${PROFILE}_out 2>&1 &
echo $! > /tmp/omp_${PROFILE}.pid
```

> 注: bash 里 FIFO 容易死锁,推荐用下面 Python 包装而不是裸 bash。
> Test Driver 在主项目根建 `bin/rpc-driver.py`,内容如下。

## 工具脚本 `bin/rpc-driver.py`

```python
#!/usr/bin/env python3
"""RPC driver for omp --mode rpc. JSONL in, JSONL out, token-aware."""
import json, os, sys, time, argparse

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--profile", required=True)
    ap.add_argument("--message", required=True)
    ap.add_argument("--events", required=True, help="events JSONL log path")
    ap.add_argument("--reply",  required=True, help="reply JSON path")
    ap.add_argument("--timeout", type=int, default=900)
    args = ap.parse_args()

    in_path  = f"/tmp/omp_{args.profile}_in"
    out_path = f"/tmp/omp_{args.profile}_out"

    # 等 ready (启动后最多 30s)
    deadline = time.time() + 30
    with open(out_path) as f:
        f.seek(0, 2)
        while time.time() < deadline:
            line = f.read()
            if '"type":"ready"' in line:
                break
            time.sleep(0.05)
            f.seek(0, 2)
        else:
            print("ERR: omp not ready", file=sys.stderr); sys.exit(2)

    # 发 prompt
    in_f = open(in_path, "w", buffering=1)
    req_id = f"req_{int(time.time()*1e6)}"
    in_f.write(json.dumps({"id": req_id, "type": "prompt", "message": args.message,
                           "streamingBehavior": "followUp"}) + "\n")
    in_f.flush()

    # tail stdout, 收集 usage + text + 写 events
    tokens = {"input": 0, "output": 0, "cacheRead": 0, "cacheWrite": 0}
    text = ""; ev_count = 0
    deadline = time.time() + args.timeout
    with open(out_path) as f, open(args.events, "w") as ev_f:
        f.seek(0, 2)
        while time.time() < deadline:
            line = f.readline()
            if not line:
                time.sleep(0.02); continue
            try: ev = json.loads(line)
            except json.JSONDecodeError: continue
            ev_f.write(line); ev_f.flush(); ev_count += 1
            ame = ev.get("assistantMessageEvent") or {}
            if ev.get("type") == "message_update" and ame.get("type") == "text_delta":
                text += ame.get("delta", "")
            if ev.get("type") == "message_end":
                u = (ev.get("message") or {}).get("usage") or {}
                for k in tokens: tokens[k] += u.get(k, 0)
            if ev.get("type") == "agent_end":
                json.dump({"req_id": req_id, "text": text, "tokens": tokens,
                           "events_count": ev_count, "events_log": args.events},
                          open(args.reply, "w"), ensure_ascii=False)
                return
    print("ERR: agent_end timeout", file=sys.stderr); sys.exit(3)

if __name__ == "__main__":
    main()
```

每一步调用:

```bash
python3 bin/rpc-driver.py --profile "$PROFILE" \
  --message "/bp-init" \
  --events .omp.run/${STEP}-events.jsonl \
  --reply  .omp.run/${STEP}-reply.json
```

## 每步循环 (Test Driver 跑)

```bash
STEP=$1           # 例: "01-init"  "02-grill"  "03-research" …
MESSAGE=$2        # 例: "/bp-init"
RUN=.omp.run/${STEP}; mkdir -p "$RUN"

# 1. 驱动 SUT 跑这步
python3 bin/rpc-driver.py --profile "$PROFILE" \
  --message "$MESSAGE" \
  --events  "$RUN/events.jsonl" \
  --reply   "$RUN/reply.json"

# 2. 取证 (fixture 改动)
cd "$FIXTURE"
git add -A
git diff --cached --stat         > ../$RUN/diffstat.txt
git diff --cached               > ../$RUN/diff.patch
[ -f bp/state.md ] && cp bp/state.md ../$RUN/state.md

# 3. 读 SUT 真实 session 文件 (取证源)
SESS=$(ls -t ~/.omp/agent/sessions/*/$(date +%Y-%m-%d)_*.jsonl 2>/dev/null | head -1)
[ -n "$SESS" ] && tail -200 "$SESS" > ../$RUN/session-tail.jsonl

# 4. token 累计
echo "${STEP},$(jq -r '.tokens | [.input,.output,.cacheRead,.cacheWrite] | join(",")' ../$RUN/reply.json),$(date +%s)" \
  >> ../$RUN/token-budget.csv

# 5. 写 verdict (Test Driver 自己判定)
echo "verdict: PENDING — 待 Test Driver 判读" > ../$RUN/verdict.md
cd -
```

## 修复 / 重置 / 重跑

```bash
# 修复平台 (改 src/templates/ 后)
( cd ~/vault/projects/specworkflow && npm run build && bp update )

# 杀掉 SUT, 清理 FIFO
kill $(cat /tmp/omp_${PROFILE}.pid) 2>/dev/null
rm -f /tmp/omp_${PROFILE}_{in,out} /tmp/omp_${PROFILE}.pid

# fixture 重置
cd "$FIXTURE" && git rm -rfq . && git checkout -- . && git clean -fdx
bp init --yes
# 然后从上次成功检查点之后重新发命令(新 PROFILE)
```

# 每步检查 (verdict 必查项)

| 步骤 | 必查 |
|---|---|
| `/bp-init` | `bp/` 齐 + `state.md` frontmatter 合规 + 16 commands/8 agents/16 skills 生成 |
| `/bp-grill` | `requirements.md` 覆盖选题 + 已填充非空 |
| `/bp-research` | `research/*` 至少 1 个 stack,无 TODO |
| `/bp-roadmap` | `roadmap.md` 含 ≥3 phase,每 phase ≥1 change 候选 |
| `/bp-discuss` | 当前 phase 的 `design.md`/`specs`/`delta-specs` 完整,无占位 |
| `/bp-research-phase` | `research-phase/` 对应设计决策 |
| `/bp-split` | `changes/` 下 ≥1 个 change proposal + plan |
| `bp continue change <n>` | 走过 plan→apply→review→verify→archive 全链;每个 artifact 出现且非空 |
| 终点 | `bp state` 显示所有 change archived,且 fixture 代码能跑通关 |

verdict 模板: `verdict: PASS|FAIL(层)|REPLAN|REAPPLY — 一行理由`

# 退出条件 (本 round 停)

任一发生即停:
- 全链路 verifications PASS,代码可启动,推箱子至少完成 1 关
- 同一根因层连续失败 ≥ 3 次(非微调能解决)
- 累计 OMP `usage.totalTokens` > 150k 仍未推进到 archive

# 输出交付物

最后一次循环结束后,在主项目根下产出 `TEST-REPORT.md`,含:
1. 全链路步进表(每步 verdict + 取证路径)
2. 修复清单(diff 摘要 + 根因层 + 修复后第几次循环跑通)
3. 质量审查:
   - 代码: `tsc` 通过 + 关键单测覆盖 + 无 `any` 滥用 + 守 conventions
   - 文档: specs/delta-specs/design 可被回读指导开发(抽样 1 change,你按规格独立写,对比 OMP 写的)
4. Token 分析: 每步 in/out/cache read/write + 占总 token 比例;指出冗余步或 Prompt 重复点
5. 优化方案: 分四类 — Prompt/TEMPLATE/ENGINE/架构;每条标影响面 + 改动量 + 预计 token 降幅 + 是否值得(H/M/L)

# 约束
- **禁止自动化编排脚本**: 不得用 `task` 子代理、`parallel`/pipeline、
  无人值守脚本循环把整轮测试包给代理跑。每步的 SUT 驱动 → 取证 → verdict
  判读 → 修复决策,必须由 Test Driver 亲自执行并显式确认。
  例外仅限纯读取证(`read` session.jsonl、`git diff`、`jq` 解析等只读操作可
  并行);子代理**仅可用于独立分析一个片段**(如审计某文件),**不得用于
  驱动下一轮循环或代为写 verdict**。这正是本测试的目的 — Test Driver 自身
  走一遍,才能发现哪一步是流程/模板/提示词设计上的真实问题。
- 永不假装通过:某次检查跳过写 SKIPPED 注明原因
- 修复必须可复现: 每次原子 commit, 记入 `.omp.run/<step>/commit`
- 用户输入: 无需再问,按协议直接执行;只有 fixture 选题理由不成立时才停下来重提
- 产出物路径: 主项目根下 `.omp.run/<fixture迭代序号>/`,保留所有失败与重置记录

# 已知坑 (预先记下)
- FIFO 必须 OMP 进程先开读端,否则 SUT 启动会卡 — 用 `bin/rpc-driver.py` 包装避免
- `--auto-approve` 必需,否则 SUT 卡在 approval 提示
- RPC 模式 reset 了 `todo.*`/`task.*`/`advisor.*` 等设置,不影响本测试
- session 文件路径由 cwd hash 决定,fixture 路径要稳,不要 `/tmp/...`(可能被 hash 撞)
- `streamingBehavior: "followUp"` 必须带,否则 OMP 内部 streaming 状态下会拒收