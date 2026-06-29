# Change Summary: npm-publish-config

## 描述

npm 发布配置完善 + README.md 编写。

## 产出文件

- `package.json` (更新) — 添加 keywords/repository/exports 字段
- `README.md` — 安装/快速开始/工作流/命令/配置（1450 bytes）

## 验证

- [x] npm pack --dry-run → specwf-0.1.0.tgz 成功
- [x] tsc --noEmit 通过
- [x] vitest 79/79 通过
