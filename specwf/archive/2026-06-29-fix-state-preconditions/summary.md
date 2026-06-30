# Change Summary: fix-state-preconditions

> **完成日期**: 2026-06-29
> **Change 类型**: adhoc

---

## Intent

状态转移命令（set-step / set-milestone / set-phase）没有任何前置校验，可以随意推进状态，即使必要文档不存在或还是模板空壳。OMP command 模板也没有指引 agent 使用 CLI 推进状态。

本变更：
1. 新增 `src/core/state-validator.ts` 模块，为每步定义退出条件（exit criteria），在推进状态前校验前置条件
2. `set-step` 集成校验，前置条件不满足时拦截并输出具体缺失项
3. `continue` 输出增强：增加步骤描述、产出物列表、command 文件参考
4. `package.json` 增加 prepare 脚本，`npm install` 后自动 build

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/core/state-validator.ts` | 新增 | 退出条件定义 + `validateStepAdvance()` 校验函数 |
| `src/core/continue.ts` | 修改 | 新增 `STEP_INFO` 步骤信息表（描述/产出物/文件参考），`determineChangeNextStep` 和 `determineNextStep` 返回 `nextStepInfo` |
| `src/commands/specwf-state.ts` | 修改 | `setStep` 在 `updateState` 前调用 `validateStepAdvance`，校验不通过时输出错误并不修改状态 |
| `src/commands/specwf-continue.ts` | 修改 | `formatContinueResult` 输出增强：显示步骤描述、产出物列表、command 文件参考 |
| `package.json` | 修改 | 增加 `prepare` 脚本，`npm install` 后自动执行 `npm run build` |

## 关键决策

- **以退出条件（exit criteria）驱动校验**：不定义"从哪里到哪里"的转移规则，而是为每步定义离开该步前必须满足的文档/产物条件。`validateStepAdvance(type, step, cwd)` 查找当前步骤的退出条件，逐一检查
- **模板空壳检测**：文件内容中 `{{placeholder}}` 模式出现超过 3 次即判定为模板空壳，输出具体路径和提示
- **校验不阻塞命令**：校验失败时只输出错误列表，不修改状态，不抛异常。用户可以自行补充缺失文档后重试
- **默认放行**：无显式退出条件的步骤默认通过，不产生额外限制
- **continue 输出增强**：每个步骤映射到 StepInfo（描述/产出物列表/fileRef），不改变原有输出结构，仅追加细节

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ 0 errors |
| vitest run | ✅ 79/79 passed |
| npm run build | ✅ 74KB |
| E2E: set-step 在 requirements.md 不存在时拦截并显示错误 | ✅ |
| E2E: set-step 在 requirements.md 存在时通过 | ✅ |
| E2E: continue 输出含步骤描述 + 产出物 + 文件参考 | ✅ |
| E2E: continue change 显示正确的下一步（appled → review） | ✅ |
