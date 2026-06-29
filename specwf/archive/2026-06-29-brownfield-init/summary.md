# Change Summary: brownfield-init

## 描述

存量项目模式 + @clack/prompts 交互向导。

## 产出文件

- `src/prompts/init-wizard.ts` — 交互式配置向导（profile/platform/brownfield 选择）
- `src/core/brownfield.ts` — 存量项目扫描（detectProjectInfo + generateCodebaseReport + bootstrapSpecs + runBrownfieldInit）
- `src/commands/specwf-init.ts` (更新) — 集成 --brownfield flag + 交互向导

## 验证

- [x] tsc --noEmit 通过
- [x] vitest 79/79 通过
