# Verification: fix-milestone-archive

> 验证时间: 2026-06-30

## 测试结果

| 测试 | 类型 | 结果 |
|------|------|------|
| vitest run | unit + integration | ✅ 79/79 |
| npm run build | build | ✅ 78KB |

## 手工验证

| 测试 | 结果 |
|------|------|
| 切换 milestone 时归档上一里程碑 | ✅ |
| 归档到 archive/milestones/<name>/phases/ | ✅ |
| 原 milestones/ 目录被移动 | ✅ |
| 已有 change 归档不受影响 | ✅ |

## 归档结构

```
archive/
├── 2026-06-29-xxx/          ← change 归档（不变）
└── milestones/
    └── <name>/              ← 里程碑归档（新增）
        └── phases/.../
```
