# 临时 Change

与 milestone/phase 无关的独立变更，直接走标准 Change 循环。适用于紧急修复、独立改进等场景。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 步骤 2：获取上下文

```bash
specwf context adhoc
```

读取输出的文件清单。

### 步骤 3：创建

```bash
specwf change new <change-name>
```

CLI 自动创建 `specwf/changes/<change-name>/` 目录并生成模板文件：
- proposal.md（提议模板）
- design.md（设计模板）
- tasks.md（任务模板）
- specs/（delta-specs 目录）

### 步骤 4：推进

```bash
specwf continue change <change-name>
```

读取该 Change 的当前状态，自动路由到对应阶段（plan → apply → review → verify → archive），各阶段对应 specwf 子代理。

---

## 参数

```
<change-name>
```
