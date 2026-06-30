# 编码规约

> **记录时间**: [YYYY-MM-DD]
> **分析范围**: `{{模块/仓库路径}}`
> **状态**: {{草稿 / 已评审 / 已锁定}}

<!--
填写指引：
本模板由 codebase-mapper 在分析完代码仓库后自动填充，用于记录项目中
实际遵循的编码规约，供后续阶段的开发者和审查者参考。

每个章节应描述当前代码库中**实际存在**的约定，而非理想中的最佳实践。
如果某条目在代码库中有例外情况，请在备注中注明。
-->

---

## 代码风格

### 命名规范

<!--
描述代码库中各类标识符的命名约定。
对每种命名风格，提供代码库中的实际示例。
-->

| 类别 | 风格 | 示例 | 备注 |
|------|------|------|------|
| 变量 | {{camelCase / snake_case / kebab-case}} | `{{exampleVariable}}` | {{是否在 React 组件外有例外}} |
| 常量 | {{UPPER_CASE / camelCase}} | `{{MAX_RETRY_COUNT}}` | {{特殊处理规则}} |
| 函数 | {{camelCase / PascalCase / snake_case}} | `{{handleClick}}` | {{回调 / hook 前缀约定}} |
| 类 / 组件 | {{PascalCase}} | `{{UserProfile}}` | {{是否有命名后缀约定}} |
| 类型 / 接口 | {{PascalCase}} | `{{UserProfileProps}}` | {{接口前缀（如 I）规则}} |
| 枚举 | {{PascalCase / UPPER_CASE}} | `{{StatusType}}` | {{枚举值命名风格}} |
| 文件 | {{kebab-case / PascalCase / snake_case}} | `{{user-profile.ts}}` | {{文件扩展名与内容映射规则}} |
| 目录 | {{kebab-case / camelCase}} | `{{user-profile/}}` | {{目录与模块对应关系}} |

### 格式化约定

<!--
描述自动格式化工具的配置和人工维护的格式约定。
-->

- **自动格式化工具**: {{Prettier / ESLint --fix / rustfmt / Black / gofmt / 未使用}}
- **缩进**: {{2 空格 / 4 空格 / Tab}}
- **行最大长度**: {{80 / 100 / 120}}
- **引号风格**: {{单引号 / 双引号}}
- **分号**: {{必须 / 可选 / 无}}
- **尾随逗号**: {{多行时 / 总是 / 从不}}
- **文件末尾空行**: {{是 / 否}}
- **配置检查方式**: {{CI 检查 / husky pre-commit hook / lint-staged / 人工}}

### 注释规范

<!--
描述注释的类型、语言、格式和应避免的情况。
-->

- **注释语言**: {{中文 / 英文 / 混合}}
- **文档注释**: {{TSDoc / JSDoc / docstring / 无}}
- **TODO 格式**: `{{TODO(your-name): [YYYY-MM-DD] 描述}}`
- **FIXME 格式**: `{{FIXME: [YYYY-MM-DD] 描述}}`
- **必须避免**: {{注释掉的代码 / 过时的实现说明 / 事实性谎言}}
- **复杂逻辑**: {{必须附带实现思路注释}}

---

## 文件组织

### 模块结构

<!--
描述项目的模块组织方式和目录结构约定。
如果项目使用分层架构或领域驱动设计，在此描述各层的职责和依赖方向。
-->

```
{{项目根目录}}/
{{  src/                    # 源码目录}}
{{    components/           # 共享组件}}
{{    hooks/                # 自定义 Hooks}}
{{    utils/                # 工具函数}}
{{    pages/                # 页面级组件}}
{{    services/             # API 调用层}}
{{    store/                # 状态管理}}
{{    types/                # 类型定义}}
{{  }}
{{  apps/                   # 多应用入口（monorepo）}}
{{    web/}}
{{    mobile/}}
{{  }}
{{  packages/               # 共享包（monorepo）}}
{{    shared/}}
```

### 单文件结构

<!--
描述一个源文件中各元素的排列顺序约定。
-->

```
// 1. 版权 / 许可证头（如有）
// 2. 导入声明（按约定顺序分组）
// 3. 类型 / 接口定义
// 4. 常量定义
// 5. 工具函数
// 6. 主要逻辑 / 组件定义
// 7. 导出声明
```

### 导入顺序

<!--
描述导入语句的分组和排序约定。
-->

| 优先级 | 导入源类别 | 示例 |
|--------|-----------|------|
| 1 | 标准库 / 运行时 | `{{react, fs, path}}` |
| 2 | 第三方依赖 | `{{lodash, axios}}` |
| 3 | 项目内部绝对路径 | `{{@/components/Button}}` |
| 4 | 相对路径导入 | `{{./utils/format}}` |
| 5 | 类型导入 | `{{import type { ... }}}` |

- **组间分隔**: {{空行分隔 / 注释标记 / 无分隔}}
- **组内排序**: {{按字母序 / 按长度 / 手动}}
- **允许的导入源**: {{只允许以上 5 类，不直接导入 node_modules 深层路径}}

### 文件职责边界

- **每个文件一个主要导出** (single-responsibility per module): {{是 / 否}}
- **文件最大行数**: {{建议不超过 [500] 行}}
- **函数最大行数**: {{建议不超过 [80] 行}}
- **循环依赖检测**: {{启用 / 未启用}} | 检测工具: {{Madge / dpdm / circular-dependency-plugin / 无}}
- **不允许的模式**:
  - {{barrel 索引文件（index.ts）中导出深层模块的内部类型}}
  - {{跨层引用（如 utils 直接导入 components）}}

---

## 错误处理

### 错误分类

<!--
描述项目中使用的错误类型及其用途。
-->

| 错误类型 | 使用场景 | 示例 | 位于 |
|---------|---------|------|------|
| {{应用级错误类}} | {{业务逻辑异常}} | `{{BusinessError}}` | `{{src/errors/BusinessError.ts}}` |
| {{网络/请求错误}} | {{API 调用失败}} | `{{ApiError}}` | `{{src/errors/ApiError.ts}}` |
| {{校验错误}} | {{输入验证失败}} | `{{ValidationError}}` | `{{src/errors/ValidationError.ts}}` |
| {{未分类错误}} | {{不在上述类别的异常}} | `{{兜底 Error}}` | 由全局错误边界捕获 |

### 错误捕获与传递

<!--
描述错误如何在代码层之间传递、转换和捕获。
-->

- **错误边界**:
  - React 组件树: {{ErrorBoundary / 无}}
  - 异步边界: {{全局 unhandledRejection / 无}}
  - API 层: {{全局 Axios 拦截器 / 无}}
- **错误转换规则**: {{下层错误在传递到上层时是否、何时、如何包装转换}}
  - 示例: `{{API 层将 AxiosError 转换为 ApiError(code, message, status)}}`
- **错误信息语言**: {{中文 / 英文 / 同时提供}}
- **错误码体系**: {{有 / 无}} — 格式: `{{ERR_XXX_9999}}`

### 错误处理模式

<!--
描述代码库中实际使用的错误处理惯用模式。
-->

| 模式 | 使用场景 | 示例模式 |
|------|---------|---------|
| try-catch | {{I/O 操作、API 调用、JSON 解析}} | `{{try { data.parse(input) } catch { fallback }}}` |
| Result 类型 | {{领域层、可恢复错误}} | `{{const result = safeParse(input); if (result.ok) ...}}` |
| Either / Option | {{纯函数式风格错误处理}} | `{{pipe(parse, fold(handleErr, handleOk))}}` |
| 守卫 / 断言 | {{前置条件检查}} | `{{assert(condition, '描述')}}` |
| 全局兜底 | {{意料之外的错误}} | `{{window.onerror / process.on('uncaughtException')}}` |
| 错误边界回退 UI | {{React 组件崩溃}} | `{{fallback={<ErrorPage />}}}` |
| 静默忽略 | {{非关键日志（可考虑移除）}} | `{{catch (e) { /* 不在意 */ }}}` |

> **注意**: 静默忽略模式属于技术债务。如果项目中存在这种模式但非故意设计，建议逐步消除。

### 日志记录

- **日志框架**: {{winston / log4js / pino / console / 无}}
- **日志级别使用约定**:
  - `error`: {{不可恢复的错误、需要人工介入}}
  - `warn`: {{可恢复但不期望的情况、即将废弃的用法}}
  - `info`: {{关键业务事件（用户注册、订单创建）}}
  - `debug`: {{开发者诊断信息，不在生产环境输出}}
- **错误上下文**: {{关键错误须附带请求 ID、用户 ID 等上下文信息}}

---

## 测试模式

### 测试框架

<!--
描述项目使用的测试工具及其版本。
-->

| 工具 | 用途 | 版本 | 配置文件 |
|------|------|------|---------|
| {{Vitest / Jest / Mocha}} | 单元测试 | {{版本号}} | `{{vitest.config.ts}}` |
| {{React Testing Library}} | 组件测试 | {{版本号}} | — |
| {{Playwright / Cypress}} | E2E 测试 | {{版本号}} | `{{playwright.config.ts}}` |
| {{MSW / Mirage}} | API Mock | {{版本号}} | `{{src/mocks/}}` |
| {{Faker}} | 测试数据生成 | {{版本号}} | — |

### 测试目录结构

<!--
描述测试文件如何组织，以及与被测试代码的关系。
-->

```
{{选项 A：内聚模式（推荐）}}
src/
{{  components/}}
{{    Button/}}
{{      Button.tsx}}
{{      Button.test.tsx      # 测试文件与被测文件同目录}}
{{      Button.stories.tsx   # 故事书文件}}
{{  }}

{{选项 B：集中模式}}
src/
{{  components/}}
{{    Button.tsx}}
{{  __tests__/}}
{{    components/}}
{{      Button.test.tsx}}
```

- **当前项目采用**: {{选项 A / 选项 B / 混合}}
- **测试文件命名约定**: `{{*.test.ts / *.spec.tsx / *.test.tsx}}`
- **测试数据文件**: {{放置在 `__fixtures__/` 目录 / 内联定义 / 通过 factory 生成}}

### 测试编写约定

<!--
描述测试编写时应遵循的具体约定。
-->

- **测试框架结构**:
  - `describe` 外层: {{描述组件/模块名称}}
  - `describe` 内层: {{按功能场景分组（如 "when loading", "with error"）}}
  - `it / test`: {{使用 AAA（Arrange-Act-Assert）模式}}
- **渲染方式**: {{render() / shallow() / mount() — 说明使用的渲染策略}}
- **查询优先顺序**（Testing Library）:
  1. `getByRole`（无障碍查询）
  2. `getByLabelText`
  3. `getByPlaceholderText`
  4. `getByText`
  5. `getByTestId`（最后手段）
- **快照测试**: {{谨慎使用 / 主要用于 UI 组件的非关键部分 / 不使用}}
- **覆盖率目标**:
  - 语句: {{80%}}
  - 分支: {{75%}}
  - 函数: {{80%}}
  - 行: {{80%}}

### Mocking 策略

<!--
描述项目中模拟外部依赖的方式和约定。
-->

| 模拟目标 | 模拟方式 | 工具 | 注意事项 |
|---------|---------|------|---------|
| HTTP API | {{MSW handler / axios-mock-adapter / fetch mock}} | {{msw}} | {{确保 mock handler 与实际 API 契约保持同步}} |
| 第三方模块 | {{vi.mock() / jest.mock() / proxyquire}} | {{vitest}} | {{只在测试文件中 mock，不污染全局}} |
| 时间相关 | {{fake timers / lolex}} | {{vi.useFakeTimers()}} | {{测试后必须 restore}} |
| 随机值 | {{mock 固定返回值}} | {{vi.fn().mockReturnValue(fixed)}} | {{避免快照因随机值变化而失败}} |
| 浏览器 API | {{jsdom / happy-dom / mock 类}} | {{vitest 环境}} | {{unsupported API 需要 polyfill}} |
| 数据库 | {{内存数据库 / 事务回滚 / mock repository}} | {{sqlite3 :memory:}} | {{集成测试使用真实数据库，单元测试 mock}} |

### 测试运行配置

- **运行命令**:
  - 全量测试: `{{pnpm test}}`
  - 单元测试: `{{pnpm test:unit}}`
  - E2E 测试: `{{pnpm test:e2e}}`
  - 带覆盖率: `{{pnpm test:coverage}}`
- **CI 集成**: {{测试在 CI 中是否必需通过才能合并}}
- **watch 模式**: {{开发时默认使用 watch 模式}}

---

## 附录

### 与本规约不一致的代码

<!--
记录已知的、未遵循上述规约的代码区域。这些是代码库中需要逐步治理
的技术债务，而不是允许的例外。
-->

| 位置 | 违反规约 | 影响 | 计划修复时间 |
|------|---------|------|-------------|
| {{文件路径}} | {{描述违反的具体规则}} | {{影响范围}} | [YYYY-MM-DD] |
| {{文件路径}} | {{描述违反的具体规则}} | {{影响范围}} | [YYYY-MM-DD] |

### 参考文档

- [YYYY-MM-DD] {{编码规约制定会议纪要 / RFC 链接}}
- [YYYY-MM-DD] {{相关 ADR 链接}}

---

> 本文档由 codebase-mapper 自动生成于 [YYYY-MM-DD]。
> 下次分析应检查上述规约是否仍有效，并更新不一致区域。
