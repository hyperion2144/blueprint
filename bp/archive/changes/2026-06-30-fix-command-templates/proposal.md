# Proposal: fix-command-templates

---

## Intent

所有 OMP command 模板内容单薄，缺：
1. 步骤说明不够详细
2. 未提及输出文件使用哪个模板（`specwf template <type>`）
3. 未标注使用的子代理
4. 未指引 agent 如何推进状态

本变更为统一更新全部 16 个 command 模板，格式标准化。

---

## 统一格式

每个 command 模板包含：

```
# <标题>

<步骤说明>

## 子代理

<使用的 specwf agent 类型，未使用则写"无">

## 产出

| 产出 | 模板 |
|------|------|

## 上下文

```bash
specwf context <step>
specwf state
```

## 推进

```bash
specwf continue
```

详情见 skills/<step>/SKILL.md
```
