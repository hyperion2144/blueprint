# 里程碑管理工作流指引

## 概述

里程碑（Milestone）是版本周期。当前 milestone 所有 phase 完成后，切换到新 milestone。

## 前置条件

- 当前 milestone 已完成

## 执行步骤

### 1. 切换 milestone

```bash
specwf state set-milestone <id>
```

### 2. 继续工作流

```bash
specwf continue
```

## 产物

- specwf/state.md — current_milestone 更新

## 验证

- [ ] specwf state 确认切换
- [ ] specwf continue 有可用下一步

## 常见陷阱

- 切换后需更新 roadmap.md 补充新 milestone 的阶段划分
