# Goal Review: refactor-generator-dispatch

**Verdict: PASS**

| Goal | Status | Evidence |
|------|--------|----------|
| generateAll 改为 PlatformRegistry 分发 | ✅ | generators/index.ts 遍历 config.platform → registry |
| OMP 注册为第一个 provider | ✅ | registerOmpProvider() 在 module scope 调用 |
| supportsCommands 移至 capability | ✅ | provider.capabilities.supportsCommands |
| bp-update 适配 | ✅ | 改用 PlatformRegistry.resolve('omp').capabilities |

**All goals achieved.**
