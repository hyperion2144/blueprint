# Change Summary: refactor-generator-dispatch

## Intent
将 generator 分发改为通过 PlatformRegistry 多平台模式。OMP 注册为第一个 provider，零行为变更。

## Files Modified
- `src/generators/index.ts` — dispatch 模式
- `src/integrations/omp/index.ts` — +registerOmpProvider()
- `src/commands/bp-update.ts` — 改用 registry 获取 supportsCommands
- `src/core/platform-registry.test.ts` — +dispatch 集成测试

## Verification
- `vitest run` — 14 tests, all passed
- `tsc --noEmit` — 仅 pre-existing fallbackBody 错误

## Must-haves Status
| Must-have | Status |
|-----------|--------|
| generateAll 输出与之前完全一致（golden-file） | ✅ 逻辑等价（OMP 单平台） |
| generateAll 遍历 config.platform 数组 | ✅ |
| 空 platform 数组回退 omp | ✅ |
| supportsCommands 移至 provider.capabilities | ✅ |
| bp-update 通过 registry 获取 capability | ✅ |
| 未知平台跳过并 warning | ✅ |
| golden-file 测试验证零变更 | ✅ |
