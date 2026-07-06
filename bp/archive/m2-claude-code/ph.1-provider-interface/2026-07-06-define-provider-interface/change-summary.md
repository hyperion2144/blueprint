# Change Summary: define-provider-interface

## Intent
定义 PlatformProvider 接口和 PlatformRegistry 类，作为多平台生成器的基础设施。

## Files Created
- `src/core/platform-registry.ts` — PlatformProvider 接口 + PlatformRegistry 实现
- `src/core/platform-registry.test.ts` — 10 个单元测试

## Verification
- `vitest run` — 1 test file, 10 tests, all passed
- `tsc --noEmit` — 已知 pre-existing error in `src/integrations/omp/commands.ts`（fallbackBody 未定义，与本 change 无关）

## Must-haves Status
| Must-have | Status |
|-----------|--------|
| PlatformProvider 接口包含 id, name, generate(config) | ✅ |
| PlatformRegistry.register/resolve | ✅ |
| register 重复 id 抛错 | ✅ |
| list() 返回所有 provider | ✅ |
| generateAll() 遍历所有 | ✅ |
| capabilities 可选默认 | ✅ |
| 测试独立无泄漏 | ✅ |
