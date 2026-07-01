# Proposal: fix-command-params

---

## Intent

很多 command 没告诉 agent 做哪个 change/phase/milestone。agent 不知道传什么参数，也不知道去查可用列表。

本变更为：
1. command 模板标注所需参数（change/phase/milestone）
2. 参数不传时，agent 通过 `specwf state` 查可用项
3. `specwf state` 输出待处理的 change、adhoc、流程进度
4. 多选时让 agent 问用户选哪个

---

## Scope

### 受影响 command

| 命令 | 参数 | 不传时行为 |
|------|------|-----------|
| plan | change <name> | 查待处理的 change |
| apply | change <name> | 同上 |
| review | change <name> | 同上 |
| verify | change <name> | 同上 |
| archive | change <name> | 同上（已有参数） |
| discuss | phase <name> | 查当前 milestone 的 phase |
| research-phase | phase <name> | 同上 |
| split | phase <name> | 同上 |
| ship | phase / milestone | 查可 ship 的项 |

### specwf state 增强

输出后增加待处理列表：
- 当前 milestone 中未完成的 phase
- 未完成的 change（按状态分组）
- 待处理的临时 change
