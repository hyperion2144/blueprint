# blueprint 技术栈调研报告

> 调研时间: 2026-06-29
> 调研方向: CLI 框架 + 构建工具 + 项目结构 + npm 发布

---

## 1. CLI 框架选型

### 1.1 候选框架概览

| 框架 | 最新版本 | 发布日期 | 周下载量 | 包体 (gzip) | 依赖数 | 许可证 |
|---|---|---|---|---|---|---|
| commander | v15.0.0 | 2026-05 | ~1200万 | ~20KB | 0 | MIT |
| yargs | v17.7.2 | 2024 | ~2500万 | ~40KB | 3 | MIT |
| @clack/prompts | v1.6.0 | 2026-06 | ~35万 | ~13KB | 2 | MIT |
| clipanion | v5.2.1 | 2026-03 | ~70万 | ~5KB | 0 | MIT |
| cac | v6.7.14 | 2025-11 | ~3100万 | ~5KB | 0 | MIT |
| 自解析 argv | — | — | — | 0 | 0 | — |

### 1.2 各维度对比

#### TypeScript 支持

| 框架 | 内置类型 | 类型安全度 | 命令类型推导 |
|---|---|---|---|
| commander | ✓ 完整类型定义 | 中等（option 值类型靠声明） | 部分（`program.command()` 返回 `Command`） |
| yargs | ✓ 完整类型定义 | 中等（需 `.parse()` 后类型断言） | 弱（builder 回调内类型不精确） |
| @clack/prompts | ✓ 完整类型定义 | 好（每个 prompt 返回值类型精确） | N/A（非 CLI 框架） |
| clipanion | ✓ 完整+泛型 | **强**（class 属性装饰器声明类型） | **强**（`Command.run` 完全类型安全） |
| cac | ✓ 完整类型定义 | 较弱（返回 `ParsedArgv` 泛型有限） | 弱 |
| 自解析 | 无 | 全手写 | 无 |

#### 子命令组织

| 框架 | 嵌套深度 | 子命令模式 | 适用性评估 |
|---|---|---|---|
| commander | 任意深度 | `.command('init')` 链式 | **非常适合** — blueprint 的 9 个一级子命令 + 可选子子命令 |
| yargs | 任意深度 | `.command('init <arg>')` 声明式 | 适合，但 API 较 verbose |
| @clack/prompts | N/A | N/A | 不适用 |
| clipanion | 任意深度 | class `@Command.Path('init')` 装饰器 | 适合（Yarn 方案），class 模式较重 |
| cac | 任意深度 | `.command('init', desc)` 链式 | 适合，API 类似 commander |
| 自解析 | 自己实现 | 自己实现 | 投入产出比低 |

#### 参数解析

| 框架 | 选项解析 | 位置参数 | 校验 | 默认值 | 自动 help/version |
|---|---|---|---|---|---|
| commander | `--name <val>` / `--flag` | ✓ `.argument()` | 手动 | ✓ `.default()` | ✓ |
| yargs | `--name <val>` / `--flag` | ✓ `.positional()` | **强**（`.choices()`, `.demand()` 内置） | ✓ | ✓ |
| @clack/prompts | N/A | N/A | N/A | N/A | N/A |
| clipanion | 装饰器声明 | ✓ class 字段 | 中等（正则 + 类型） | ✓ | ✓ |
| cac | `--name <val>` / `--flag` | ✓ `.option()` | 弱 | ✓ | ✓ |
| 自解析 | 自己写 | 自己写 | 自己写 | 自己写 | 自己写 |

#### 交互式 Prompt 支持

| 框架 | 集成度 | 生态组件 | 评估 |
|---|---|---|---|
| commander | 无内置 | 需搭配 clack 或 enquirer | **按需搭配 @clack/prompts** |
| yargs | 无内置 | 同上 | 同上 |
| @clack/prompts | **原生** | text/password/confirm/select/multiselect/spinner/path/date | **blueprint init 交互向导的最佳选择** |
| clipanion | 无内置 | 需搭配 clack | 同上 |
| cac | 无内置 | 需搭配 clack | 同上 |
| 自解析 | 无 | 同上 | 同上 |

#### 文件监听

所有框架均不内置文件监听功能。blueprint 的 `--watch` 模式可通过 chokidar 或 Node `fs.watch` 实现。

#### 维护活跃度

| 框架 | 最近提交 | 发布频率 | 社区规模 | 风险评估 |
|---|---|---|---|---|
| commander | 活跃 (2026-05 发 v15) | 高 | 极大 | **低** — 稳定成熟 |
| yargs | 较慢 (v17.7.2 后活跃度下降) | 低 | 大 | **中** — 生态停滞风险 |
| @clack/prompts | 活跃 (2026-06 发 v1.6) | 高 | 中 | **低** — 核心开发者活跃 |
| clipanion | 活跃 (2026-03 发 v5.2) | 中 | 中（Yarn 核心组件） | **低** — Yarn 团队维护 |
| cac | 较慢 (v6.7.14 于 2025-11) | 低 | 中 | **中** — 个人维护 |
| 自解析 | N/A | N/A | N/A | 自己维护，无外部风险 |

### 1.3 与 blueprint 需求匹配分析

blueprint CLI 需要：

| 需求 | 优先级 | commander | yargs | clipanion | cac |
|---|---|---|---|---|---|
| 9 个一级子命令（init/update/config/state/context/continue/archive/list/template） | P0 | ✓ `.command()` 天然支持 | ✓ 声明式支持 | ✓ class 模式稍重 | ✓ 类似 commander |
| 可选子子命令（`config set`, `context <step>`） | P0 | ✓ 嵌套命令 | ✓ 嵌套命令 | ✓ 嵌套命令 | ✓ 嵌套命令 |
| init 交互式引导（prompt 序列） | P0 | 需搭配 clack | 需搭配 clack | 需搭配 clack | 需搭配 clack |
| YAML 配置读/写 | P0 | 无关 | 无关 | 无关 | 无关 |
| ESM 优先 | P1 | ✓ v15 仅 ESM | ✓ 支持 ESM | ✓ 支持 ESM | ✓ 支持 ESM |
| 类型安全 | P1 | 中 | 中 | 强 | 弱 |
| 包体积小 | P2 | 中 | 中 | 小 | 小 |

### 1.4 推荐方案

```
CLI 核心框架: commander v14（+ Node 20 兼容）或 v15（ESM-only）
交互式 Prompt: @clack/prompts（仅 blueprint init 命令中按需引入）
```

**理由：**

1. **commander 是最安全的选择** — 无可争议的最流行 TypeScript CLI 框架，社区最大、文档最全、维护最活跃。blueprint 的 9 个一级子命令映射到 commander 的 `.command()` 链式调用非常自然。

2. **v14 vs v15 的版本选择：**
   - **若保持 Node ≥ 20 要求**：使用 commander v14。v14 安全更新持续到 2027 年 5 月，完全满足 blueprint 的开发周期。同时保留 v14 的 CJS 兼容能力，方便消费方逐步迁移 ESM。
   - **若升级到 Node ≥ 22**：使用 commander v15（ESM-only），享受最新特性。blueprint 约定使用 ESM（`"type": "module"`），v15 天然契合。
   - **建议方案**：起始使用 commander v14，`package.json` 中限定 `"commander": "^14"`，Node 要求保持 `>=20`。当稳定版本发布后，再规划迁移到 v15。

3. **@clack/prompts 用作 init 交互** — 不是替代 commander，而是补充。`blueprint init` 需要交互式引导项目配置（profile 选择、platform 配置、context 录入），clack 提供 text/select/confirm/spinner 等组件。按需引入，不影响主 CLI 体积：
   ```typescript
   // src/commands/init.ts
   import * as p from '@clack/prompts'
   const profile = await p.select({
     message: '选择工作流严格度 profile:',
     options: [
       { value: 'lite', label: 'Lite' },
       { value: 'standard', label: 'Standard' },
       { value: 'strict', label: 'Strict' },
     ],
   })
   ```

4. **不选 clipanion 的理由：** class 装饰器模式 + 面向对象风格与 blueprint 的简洁函数式风格不匹配。虽有强类型安全优势，但项目复杂度不足以发挥。

5. **不选 cac 的理由：** 功能 subset 太少（无自动 help 生成、无 typescript 友好校验），需要额外轮子。

6. **不选 yargs 的理由：** 生态停滞，v17 后几乎无更新。包体约 40KB（gzip），是 commander 的两倍。

7. **不选自解析的理由：** blueprint 有 9+ 个命令 + 位置参数 + 选项校验，手写 argv 解析的维护成本远高于直接引入稳定依赖。

### 1.5 其他依赖

| 用途 | 推荐库 | 理由 |
|---|---|---|
| YAML 解析 | js-yaml (v4) | 最成熟、最广泛使用 |
| 文件监听 (--watch) | chokidar (v4) | Node fs.watch 跨平台问题的标准解决方案 |
| 日志/输出 | consola (v3) | 轻量、美观、支持 spinner |
| 配置管理 | cosmiconfig (v9) | 支持 yaml/json/js/ts 多格式配置文件搜索 |
| 唯一 ID | nanoid (v5) | 用于 change/milestone id 生成（比 uuid 更短） |

---

## 2. 构建工具选型

### 2.1 候选对比

| 工具 | 最新版本 | 发布日期 | 周下载量 | 底层引擎 | 类型声明 | ESM/CJS | Stub 模式 |
|---|---|---|---|---|---|---|---|
| tsup | v8.7.0 | 2026-06 | ~600万 | esbuild | ✓ 自动生成 | ✓ 双格式 | ✓ |
| unbuild | v1.2.2 | 2025-07 | ~300万 | Rollup | ✓ 自动生成 | ✓ 双格式 | ✓ |
| tsc (仅编译) | — | — | — | tsc | ✓ 原生 | 仅转译 | ✗ |

### 2.2 核心维度的定性对比

| 维度 | tsup | unbuild | tsc |
|---|---|---|---|
| 构建速度 | **极快**（esbuild，tsc 的 45x） | 快（Rollup，有额外开销） | 慢（无增量时） |
| 开箱即用 | **零配置** | 接近零配置 | 非零（需 tsconfig + 输出脚本） |
| ESM + CJS 双格式 | ✓ 一行配置 | ✓ 内置 preset | ✗ 需要手动 dual build |
| .d.ts 生成 | ✓ (`dts: true`) | ✓ 内置 | ✓ 原生 |
| 代码分割/摇树 | 好（esbuild） | **更好**（Rollup） | 无 |
| 外部依赖隔离 | ✓ (`noExternal` 配置) | ✓ (Rollup plugin 生态) | ✗ 需要额外打包器 |
| Dev 模式 | stub: 快速 `.d.ts` + `.mjs` 重定向 | stub: 类似 tsup | 无 |

### 2.3 推荐方案

```
构建工具: tsup v8
类型检查: tsc --noEmit（独立 run script）
```

**理由：**

1. **tsup 零配置即可满足 blueprint 的所有需求**：
   - ESM 输出（`format: ['esm']`）— blueprint 是 ESM-only 包
   - 类型声明生成（`dts: true`）
   - 打包为单文件 CLI
   - stub 模式支持开发热更
   - 一行配置即可生效

2. **unbuild 更适用于多输出库（library）而非 CLI**。unbuild 的 Rollup 摇树优势对于 CLI 工具来说收益不大（CLI 通常整体打包）。

3. **tsc 保留作类型检查** — 在 `scripts` 中使用 `tsc --noEmit` 单独做类型校验。`tsup` 的 `dts` 负责生成发布用 `.d.ts`，tsc 负责开发期的类型安全。

4. **无需 CJS 输出** — blueprint 约定 ESM（`"type": "module"`），target 设定为 `ES2022`。不必为 CJS 兼容增加复杂度。

### 2.4 tsup 配置示例

```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node20',
  dts: true,
  clean: true,
  splitting: false,
  shims: false,
  outDir: 'dist',
  banner: {
    js: '#!/usr/bin/env node',
  },
})
```

---

## 3. 项目目录结构

### 3.1 目录树设计

```
blueprint/
├── package.json                 # npm 包配置
├── tsconfig.json                # TypeScript 配置
├── tsup.config.ts               # 构建配置
├── vitest.config.ts             # 测试配置
├── .gitignore
├── README.md
│
├── bin/                         # CLI 入口（编译后产物）
│   └── blueprint.js                # 编译后的入口文件（shebang + 执行）
│
├── src/                         # 源代码
│   ├── cli.ts                   # CLI 入口：创建 commander program，注册命令
│   │
│   ├── commands/                # 子命令实现，每命令一文件
│   │   ├── blueprint-init.ts       # blueprint init
│   │   ├── blueprint-update.ts     # blueprint update
│   │   ├── blueprint-config.ts     # blueprint config / config set
│   │   ├── blueprint-state.ts      # blueprint state
│   │   ├── blueprint-context.ts    # blueprint context <step>
│   │   ├── blueprint-continue.ts   # blueprint continue
│   │   ├── blueprint-archive.ts    # blueprint archive <change>
│   │   ├── blueprint-list.ts       # blueprint list
│   │   └── blueprint-template.ts   # blueprint template <type>
│   │
│   ├── lib/                     # 核心逻辑
│   │   ├── project.ts           # Project 模型（读取/更新 project.yml）
│   │   ├── state-machine.ts     # 状态机引擎
│   │   ├── state-file.ts        # state.md 读写
│   │   ├── spec-injector.ts     # spec 注入（context 命令核心）
│   │   ├── delta-merge.ts       # delta-spec 合并
│   │   ├── code-extract.ts      # 代码认知提取（archive 时回灌）
│   │   ├── generator.ts         # 平台文件生成（slash commands / skills / agents）
│   │   ├── template.ts          # 模板渲染引擎
│   │   ├── file-tree.ts         # 产物目录树操作（blueprint/ 下的骨架管理）
│   │   └── config.ts            # project.yml 解析与校验
│   │
│   ├── types/                   # TypeScript 类型定义
│   │   ├── project.ts           # Project/Milestone/Phase/Change 类型
│   │   ├── state.ts             # 状态机类型
│   │   ├── spec.ts              # Spec 相关类型
│   │   └── config.ts            # 配置（project.yml）类型
│   │
│   ├── prompts/                 # 交互式 prompt（仅 init 使用）
│   │   ├── init-wizard.ts       # init 交互向导（profile/platform/context）
│   │   └── utils.ts             # prompt 工具函数
│   │
│   ├── templates/               # 内置模板资源
│   │   ├── project.yml          # 新项目 project.yml 模板
│   │   ├── state.md             # 初始 state.md
│   │   ├── change.blueprint.yaml   # change 元数据模板
│   │   └── proposal.md          # change proposal 模板
│   │
│   ├── platforms/               # 多平台文件生成
│   │   ├── omp/                 # OMP 平台
│   │   │   ├── commands/        # slash command 模板
│   │   │   └── agents/          # agent 定义模板
│   │   └── claude-code/         # Claude Code 平台（Phase 2）
│   │       ├── commands/
│   │       └── agents/
│   │
│   └── utils/                   # 通用工具函数
│       ├── logger.ts            # 日志输出（consola 封装）
│       ├── path.ts              # 路径工具（blueprint 根目录定位）
│       ├── id.ts                # ID 生成（nanoid）
│       └── fs.ts                # 文件系统工具
│
├── tests/                       # 测试（可选项目级，推荐与源文件同目录）
│   ├── fixtures/                # 测试 fixture
│   │   └── test-project/        # 模拟项目结构
│   └── integration/             # 集成测试
│
└── dist/                        # 构建产物（gitignore）
    ├── cli.js
    └── cli.d.ts
```

### 3.2 目录设计原则

1. **`src/commands/` 每命令一文件** — 与 `blueprint <subcommand>` 一一对应。命名 `blueprint-{cmd}.ts` 使其在文件排序中自然归组，且见名知所属。

2. **`src/lib/` 为核心业务逻辑** — 不与 CLI 框架耦合。理论上可以直接被其他模块（如 slash command 的 prompt）调用。每个模块单一职责。

3. **`src/types/` 独立目录** — 类型定义集中管理，避免循环引用，方便 LSP 导航。发布时 `dist/` 包含 `.d.ts` 供消费方使用 API 类型。

4. **`src/prompts/` 独立于 `commands/`** — 交互式 prompt 逻辑独立，避免 init 命令文件膨胀。只有在 `blueprint init` 中按需导入。

5. **`src/templates/` 为静态资源** — 编译时通过 tsup 的 `--publicDir` 或内联方式打包进 CLI 二进制。

6. **`src/platforms/` 为多平台生成器** — 按平台分离，清晰支撑 Phase 2 的 Claude Code 平台扩展。

### 3.3 与 OpenSpec 的对照

| OpenSpec | blueprint | 说明 |
|---|---|---|
| `bin/openspec.js` | `bin/blueprint.js` | CLI 入口（编译后） |
| `src/cli/` | `src/commands/` | 命令定义 |
| `src/core/` | `src/lib/` | 核心业务逻辑 |
| `src/utils/` | `src/utils/` | 工具函数 |
| N/A | `src/types/` | 类型定义（独立目录提高 LSP 体验） |
| N/A | `src/prompts/` | 交互式 prompt（blueprint 特有需求） |
| N/A | `src/templates/` | 内置模板（生成 blueprint/ 目录用） |
| N/A | `src/platforms/` | 多平台文件生成 |

---

## 4. npm 发布配置

### 4.1 package.json 关键字段

```jsonc
{
  "name": "blueprint",
  "version": "0.1.0",
  "description": "规格驱动开发工作流 — AI agent 的生产力工具",
  "type": "module",                          // ESM 优先
  "bin": {
    "blueprint": "./dist/cli.js"               // CLI 入口
  },
  "files": [
    "dist/",
    "README.md",
    "LICENSE"
  ],
  "main": "./dist/cli.js",                  // CJS 回退（本包 CJS 模式下）
  "exports": {
    ".": {
      "import": "./dist/cli.js",
      "default": "./dist/cli.js"
    },
    "./package.json": "./package.json"
  },
  "engines": {
    "node": ">=20"                           // Node 最低版本
  },
  "types": "./dist/cli.d.ts",               // 类型入口
  "sideEffects": false,                      // 可 Tree-shaking

  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "prepublishOnly": "npm run build && npm run typecheck && npm run test"
  }
}
```

### 4.2 tsconfig.json

```jsonc
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 4.3 发布策略

1. **`bin` 字段** — 只指向 `dist/cli.js`。编译后的 CLI 文件中通过 tsup `banner` 注入 `#!/usr/bin/env node` shebang。npm 自动 chmod +x。

2. **`files` 字段** — 白名单模式。只发布 `dist/` 目录 + 文档。不包含 `src/`、`tests/`、`tsconfig.json` 等开发文件。敏感地，`./blueprint/` 产物目录（在用户项目中生成）**不**属于 npm 包内内容。

3. **`engines.node`** — `>=20`。与 coding 约定一致。如果采用 commander v15（需 Node 22），则调整为 `>=22`。

4. **`exports` 字段** — 当前只用 default export。未来如果 src/lib/ 需要被外部使用的 API（如编程接口供 slash command agent 调用），可扩展为多重 export：
   ```jsonc
   "exports": {
     ".": "./dist/cli.js",
     "./state-machine": {
       "import": "./dist/state-machine.js",
       "types": "./dist/state-machine.d.ts"
     }
   }
   ```

5. **`prepublishOnly`** — 构建 + 类型检查 + 测试三步门控，防止发布损坏版本。

---

## 5. 最终依赖清单

### 5.1 dependencies（运行时）

| 包 | 用途 | 推荐版本 | 安装后 (unpacked) |
|---|---|---|---|
| commander | CLI 框架 | ^14.1 | ~220KB |
| @clack/prompts | 交互式 prompt | ^1.6 | ~50KB |
| js-yaml | YAML 解析/写入 | ^4.1 | ~100KB |
| consola | 日志输出 | ^3.2 | ~40KB |
| chokidar | 文件监听 | ^4.0 | ~200KB |
| cosmiconfig | 配置搜索 | ^9.0 | ~200KB |
| nanoid | ID 生成 | ^5.0 | ~5KB |
| | **合计** | | **~815KB** |

### 5.2 devDependencies（开发）

| 包 | 用途 | 推荐版本 |
|---|---|---|
| typescript | 语言 | ^5.7 |
| tsup | 构建 | ^8.7 |
| vitest | 测试 | ^3.0 |
| @types/node | Node 类型 | ^22 |
| @types/js-yaml | js-yaml 类型 | ^4 |
| eslint | 代码检查 | ^9 |
| prettier | 格式 | ^3 |

---

## 6. 决策摘要

| 决策 | 选择 | 备选 | 关键理由 |
|---|---|---|---|
| CLI 框架 | **commander** ^14.1 | clipanion / cac / yargs | 最流行、社区最大、子命令组织自然、维护活跃 |
| 交互式 Prompt | **@clack/prompts** (按需) | enquirer / inquirer | 美观、TypeScript-first、轻量 |
| YAML | **js-yaml** ^4.1 | yaml | 最成熟、社区最大 |
| 构建工具 | **tsup** ^8.7 | unbuild / tsc | 零配置、esbuild 快、ESM + dts 一步输出 |
| 类型检查 | **tsc --noEmit** (独立) | — | 官方类型检查器，无可替代 |
| 测试 | **vitest** ^3.0 | jest | 快、ESM 原生、TS 无需额外配置 |
| 唯一 ID | **nanoid** ^5.0 | uuid | 更短、URL-safe |

---

*本文件由 blueprint 技术调研子代理自动生成，是 blueprint 项目技术栈的权威参考。*
