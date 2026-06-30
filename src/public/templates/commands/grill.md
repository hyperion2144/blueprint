# 需求探讨

通过逐条提问收集需求，产出 requirements.md。Grill 阶段不写代码。

## 步骤

### 1. 检查状态

```bash
specwf state
```

确认当前状态是否可执行本步骤。

### 2. 获取上下文

```bash
specwf context grill
```

读取输出的文件清单（project.md、requirements.md 等）。

### 3. 执行需求探讨

按 5W1H 框架逐层提问，收集以下信息：
- **概述** — 项目核心目标
- **用户角色** — 目标用户及其职责
- **功能范围** — 做什么、不做什么
- **非功能需求** — 性能、安全、合规
- **技术倾向** — 偏好技术栈
- **风险** — 已知风险和未决问题

每项达成共识后记录到 `@specwf/requirements.md`。

### 4. 确认共识

与用户逐项回顾 requirements.md，确保无歧义。

### 5. 推进

```bash
specwf continue
```

continue 检查 requirements.md 存在且内容完整后，自动推进到下一阶段（research）。

## 参数

无。

## 产出

| 文件 | 说明 |
|------|------|
| `@specwf/requirements.md` | 需求共识文档（自由格式） |
