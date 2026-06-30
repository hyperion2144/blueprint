# 里程碑管理

切换或创建 Milestone，设置当前阶段。

## 步骤

### 步骤 1：检查状态

```bash
specwf state
```

查看当前 milestone 和 phase 信息。

### 步骤 2：获取上下文

```bash
specwf context milestone
```

读取输出的文件清单。可参考 `@specwf/roadmap.md` 查看 milestone 列表。

### 步骤 3：切换里程碑

```bash
specwf state set-milestone <id>
```

切换到指定 milestone。CLI 自动归档上一里程碑（未 shipped 时）。

### 步骤 4：设置阶段

```bash
specwf state set-phase <id>
```

切换到指定 phase。

### 步骤 5：推进

```bash
specwf continue
```
