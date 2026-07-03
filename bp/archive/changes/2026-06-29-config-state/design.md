# Design + Tasks: implement-config + implement-state

## implement-config

文件: src/core/config.ts
- loadConfig(blueprintDir) — 读 project.yml + zod 验证
- saveConfig(blueprintDir, config) — 写回保留注释
- updateConfig(blueprintDir, updater) — 修改+写回
- resolveModels(config) — profile 默认 + 用户覆盖

## implement-state

文件:
- src/core/state-file.ts — loadState/saveState/updateState
- src/core/state-machine.ts — canTransition/getTransition/getNextSteps
- src/core/continue.ts — determineNextStep

## Tasks

- [ ] config.ts + test
- [ ] state-file.ts + test
- [ ] state-machine.ts + test
- [ ] continue.ts + test
