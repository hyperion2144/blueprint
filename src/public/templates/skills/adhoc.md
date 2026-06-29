# 创建临时 Change 工作流指引

## 概述

临时 Change 是与 milestone/phase 无关的独立变更，直接走标准 Change 循环。适用于紧急修复、独立改进等场景。

## 前置条件

- specwf 项目已初始化
- 变更名称已确定

## 执行步骤

### 1. 创建 change 目录

```bash
specwf change new <name>
```

自动生成：
- `specwf/changes/<name>/proposal.md`
- `specwf/changes/<name>/design.md`
- `specwf/changes/<name>/tasks.md`
- `specwf/changes/<name>/specs/` 目录

### 2. 填写 proposal.md

### 3. 继续推进

```bash
specwf continue
```

## 产物

- proposal.md / design.md / tasks.md
- state.md adhoc 记录

## 验证

- [ ] change 目录存在
- [ ] 模板文件已生成
- [ ] specwf state 能看到新 change

## 常见陷阱

- 临时 change 归档后统一存放在 specwf/archive/ 下
- 临时 change 不走 milestone/phase 的 discuss/research-phase/split 流程
- 如果需要关联到 phase，使用 `specwf change new --phase <id>`

## 参考

- specwf 工作流设计中的「临时 Change」章节
