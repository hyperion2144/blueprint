# Change Summary: {{change-name}}

> **完成日期**: {{date}}
> **Change 类型**: {{change-type | "adhoc / phase-change"}}

---

## Intent

<!-- 为什么做这个 change -->

{{intent}}

---

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| {{file-path-1}} | {{create / modify / delete}} | {{说明}} |
| {{file-path-2}} | {{create / modify / delete}} | {{说明}} |

---

## 关键决策

<!-- 实现中做的重要选择 -->

{{decision-1}}: {{内容}}

---

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ / ❌ |
| vitest run | N/N passed |
| npm run build | ✅ / ❌ |

---

*由 executor agent 在 apply 完成后写入*
