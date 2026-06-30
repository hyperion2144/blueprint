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

### 步骤 3：创建 Change

参数：`<change-name>`

```bash
specwf change new <change-name>
```

CLI 自动创建 `specwf/changes/<change-name>/` 目录并生成模板文件。

### 步骤 4：查看产出

| 文件 | 模板 |
|------|------|
| changes/<name>/proposal.md | specwf template artifacts/proposal.md |
| changes/<name>/design.md | specwf template artifacts/design.md |
| changes/<name>/tasks.md | specwf template artifacts/tasks.md |

### 步骤 5：推进

```bash
specwf continue change <change-name>
```

读取该 Change 的当前状态，自动路由到对应阶段。
