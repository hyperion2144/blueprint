# Technology Stack: [YYYY-MM-DD]

> **填表指引**：本文档记录项目完整技术栈信息，供实现者、评审者和维护者快速了解项目选型。每节附填写指引。

> **分析时间**: [YYYY-MM-DD]
> **分析者**: {{agent-id}}
> **扫描范围**: {{扫描的目录 / 文件列表}}

---

## 语言 Languages

<!--
填写指引：
列出项目使用的主要编程语言及次要/辅助语言。
"主要"=业务代码的主语言；"次要"=构建脚本、配置文件、少量工具等。
估算占比以了解重心。

示例：
| 语言 | 角色 | 版本要求 | 占比（估） | 备注 |
|---|---|---|---|---|
| TypeScript | 主要 | ~5.4+ | 85% | 前端 + 后端 |
| CSS | 辅助 | — | 8% | 样式文件 |
| YAML | 辅助 | — | 4% | CI / 配置 |
| Shell | 辅助 | — | 3% | 构建脚本 |
-->

| 语言 | 角色 | 版本要求 | 占比（估） | 备注 |
|---|---|---|---|---|
| [language-1] | [primary / secondary] | [version] | [xx%] | [notes] |
| [language-2] | [primary / secondary] | [version] | [xx%] | [notes] |
| [language-3] | [primary / secondary] | [version] | [xx%] | [notes] |

---

## 运行环境 Runtime

<!--
填写指引：
描述项目的运行时环境、运行时版本和包管理工具。
区分开发环境 vs 生产环境。

示例：
| 维度 | 选型 | 版本 | 备注 |
|---|---|---|---|
| 运行时 | Node.js | ^20.11 LTS | 开发 + 生产 |
| 包管理器 | pnpm | ^9.0 | workspace monorepo |
| 容器 | Docker | 24+ | 生产部署使用 |
| 操作系统 | Ubuntu | 22.04 | 生产服务器 |
-->

### 运行时

| 维度 | 选型 | 版本 | 备注 |
|---|---|---|---|
| 运行时环境 | [runtime-name] | [version-range] | [notes] |
| 包管理器 | [pm-name] | [version-range] | [notes] |
| 语言运行时版本 | [lang-runtime] | [version] | [dev / prod] |

### 运行模式

| 场景 | 启动方式 | 端口 | 备注 |
|---|---|---|---|
| 本地开发 | [dev-command] | [port] | [notes] |
| 生产启动 | [prod-command] | [port] | [notes] |
| 调试模式 | [debug-command] | [port] | [notes] |

---

## 框架 Frameworks

<!--
填写指引：
列出项目使用的核心框架、测试框架和构建工具。
核心框架是指业务代码直接依赖的框架（Web 框架、UI 框架等）。
测试框架包括 runner + assertion + mock。
构建工具包括 bundler / transpiler / task runner。

示例：
| 类别 | 选型 | 版本 | 用途 |
|---|---|---|---|
| 核心框架 | Next.js | ^14.2 | SSR / SSG / API |
| 核心框架 | React | ^18.3 | UI 组件 |
| 核心框架 | Express | ^4.18 | API 网关 |
| 测试框架 | Vitest | ^1.6 | 单元/集成测试 |
| 测试框架 | Playwright | ^1.44 | E2E 测试 |
| 构建工具 | Vite | ^5.2 | bundler |
| 构建工具 | tsc | ^5.4 | type-check |
-->

### 核心框架

| 框架 | 版本 | 用途 | 备注 |
|---|---|---|---|
| [framework-1] | [version-range] | [purpose] | [notes] |
| [framework-2] | [version-range] | [purpose] | [notes] |
| [framework-3] | [version-range] | [purpose] | [notes] |

### 测试框架

| 框架 | 版本 | 用途 | 备注 |
|---|---|---|---|
| [test-framework-1] | [version-range] | [unit / integration / e2e] | [notes] |
| [test-framework-2] | [version-range] | [unit / integration / e2e] | [notes] |

### 构建工具链

| 工具 | 版本 | 用途 | 备注 |
|---|---|---|---|
| [build-tool-1] | [version-range] | [bundler / transpiler / task-runner] | [notes] |
| [build-tool-2] | [version-range] | [bundler / transpiler / task-runner] | [notes] |

---

## 关键依赖 Key Dependencies

<!--
填写指引：
区分"关键业务依赖"和"基础设施依赖"。
关键业务依赖 = 业务逻辑直接使用、难以替换的库。
基础设施依赖 = 日志、监控、数据库驱动、中间件等基础设施类库。
不逐一列出 package.json 中所有依赖——只列对理解和维护项目有意义的。
每条附选择理由，以便后续评估替换成本。

示例：
### 关键业务依赖
| 依赖 | 版本 | 用途 | 选型理由 | 替换成本 |
|---|---|---|---|---|
| zod | ^3.22 | 运行时数据验证 | 类型安全 + 零依赖 | 中 |
| react-hook-form | ^7.51 | 表单状态管理 | 性能 + 少 re-render | 高 |
| @tanstack/react-query | ^5.40 | 服务端状态 | 缓存 / 重试 / 乐观更新 | 高 |

### 基础设施依赖
| 依赖 | 版本 | 用途 | 备注 |
|---|---|---|---|
| pino | ^8.19 | 日志 | 结构化日志，性能优先 |
| dotenv | ^16.4 | 环境变量加载 | — |
| @sentry/node | ^7.110 | 错误追踪 | 生产环境启用 |
-->

### 关键业务依赖

| 依赖 | 版本 | 用途 | 选型理由 | 替换成本 |
|---|---|---|---|---|
| [dep-1] | [version-range] | [purpose] | [rationale] | [高/中/低] |
| [dep-2] | [version-range] | [purpose] | [rationale] | [高/中/低] |
| [dep-3] | [version-range] | [purpose] | [rationale] | [高/中/低] |

### 基础设施依赖

| 依赖 | 版本 | 用途 | 备注 |
|---|---|---|---|
| [infra-dep-1] | [version-range] | [purpose] | [notes] |
| [infra-dep-2] | [version-range] | [purpose] | [notes] |
| [infra-dep-3] | [version-range] | [purpose] | [notes] |

---

## 配置 Configuration

<!--
填写指引：
分别描述环境配置和构建配置的结构。
环境配置：列出所有环境变量或配置文件，说明用途和来源。
构建配置：列出构建工具的配置文件路径和关键配置项。

示例：
### 环境变量
| 变量名 | 用途 | 来源 | 是否必填 |
|---|---|---|---|
| DATABASE_URL | PostgreSQL 连接串 | .env / CI Secrets | 是 |
| SESSION_SECRET | Session 加密密钥 | .env / CI Secrets | 是 |
| NODE_ENV | 运行环境标识 | 平台自动注入 | 是 |
| NEXT_PUBLIC_API_BASE | 前端 API 地址 | .env.local | 是 |

### 构建配置
| 配置文件 | 用途 | 关键配置项 |
|---|---|---|
| vite.config.ts | Vite 构建配置 | alias, plugins, proxy |
| tsconfig.json | TypeScript 编译 | strict: true, target: es2022 |
| .eslintrc.cjs | 代码规范 | @typescript-eslint, react rules |
-->

### 环境配置

| 配置项 / 变量名 | 用途 | 来源 / 注入方式 | 是否必填 |
|---|---|---|---|
| [config-key-1] | [purpose] | [source] | [是/否] |
| [config-key-2] | [purpose] | [source] | [是/否] |
| [config-key-3] | [purpose] | [source] | [是/否] |

### 构建配置

| 配置文件路径 | 用途 | 关键配置项 |
|---|---|---|
| [path-1] | [purpose] | [key-config-items] |
| [path-2] | [purpose] | [key-config-items] |
| [path-3] | [purpose] | [key-config-items] |

### 配置文件清单

<!-- 列出项目中所有配置文件，便于新加入者快速了解配置层 -->

| 文件 | 格式 | 用途 | 是否提交 |
|---|---|---|---|
| [file-path] | [json / yaml / toml / js / ts / env] | [purpose] | [是/否] |
| [file-path] | [json / yaml / toml / js / ts / env] | [purpose] | [是/否] |
| [file-path] | [json / yaml / toml / js / ts / env] | [purpose] | [是/否] |

---

## 平台需求 Platform Requirements

<!--
填写指引：
区分开发环境和生产环境的最低需求。
开发环境：开发者本地需要安装的工具、硬件建议。
生产环境：服务器规格、依赖服务、网络要求。

示例：
### 开发环境
| 需求项 | 最低要求 | 推荐 | 备注 |
|---|---|---|---|
| 操作系统 | macOS 12+ / Ubuntu 20.04+ | macOS 14+ | — |
| CPU | 4 核 | 8 核 | — |
| 内存 | 8 GB | 16 GB | monorepo 内存占用较高 |
| 磁盘 | 10 GB 空余 | 20 GB SSD | node_modules ~500MB |
| Node.js | ^18.0 | ^20.11 LTS | 建议使用 nvm |
| pnpm | ^8.0 | ^9.0 | 建议 corepack enable |
| Docker | 24+ | 最新 | 可选，本地数据库 |

### 生产环境
| 需求项 | 规格 | 备注 |
|---|---|---|
| 服务器 / 平台 | Railway (auto-scale) | 容器化部署 |
| CPU / 内存 | 2 vCPU / 4 GB RAM (最低) | 随负载自动扩展 |
| 存储 | 20 GB SSD 持久卷 | 日志 + 上传文件 |
| 数据库 | PostgreSQL 15+ (独立服务) | Railway 插件 |
| Redis | 7+ (独立服务) | Session / Cache |
| 网络 | HTTPS / TLS 1.3 | Cloudflare 代理 |
| 域名 | api.example.com | CNAME |
-->

### 开发环境

| 需求项 | 最低要求 | 推荐配置 | 备注 / 安装方式 |
|---|---|---|---|
| 操作系统 | [os-min] | [os-recommended] | [notes] |
| 处理器 | [cpu-min] | [cpu-recommended] | [notes] |
| 内存 | [ram-min] | [ram-recommended] | [notes] |
| 磁盘 | [disk-min] | [disk-recommended] | [notes] |
| 运行时版本 | [runtime-version-min] | [runtime-version-recommended] | [install-method] |
| 包管理器 | [pm-version-min] | [pm-version-recommended] | [install-method] |
| 容器工具 | [docker-min] | [docker-recommended] | [optional / required] |
| 数据库 | [db-min] | [db-recommended] | [install-method] |
| 其他工具 | [tool-min] | [tool-recommended] | [install-method] |

### 生产环境

| 需求项 | 规格 | 备注 |
|---|---|---|
| 部署平台 | [platform-name] | [deployment-mode] |
| 计算资源 | [cpu-ram-spec] | [scaling-notes] |
| 存储 | [storage-spec] | [persistence-notes] |
| 数据库 | [db-spec] | [managed / self-hosted] |
| 缓存 | [cache-spec] | [notes] |
| 网络 | [network-spec] | [cdn / dns / tls-notes] |
| 域名 | [domain-list] | [dns-config] |
| 第三方服务 | [service-list] | [integration-notes] |

### 依赖服务清单

<!--
列出项目运行时依赖的外部服务及其版本/连接方式。
便于排查故障时快速了解依赖拓扑。
-->

| 服务 | 版本 | 访问方式 | 用途 | 环境 |
|---|---|---|---|---|
| [service-1] | [version] | [host:port / URL] | [purpose] | [dev / staging / prod] |
| [service-2] | [version] | [host:port / URL] | [purpose] | [dev / staging / prod] |
| [service-3] | [version] | [host:port / URL] | [purpose] | [dev / staging / prod] |

---

## 版本约束摘要

<!--
填写指引：
将以上所有版本约束汇总到一张表，作为快速参考。
这是排错时第一手查阅的地方——版本不匹配往往是最常见的构建问题。
-->

| 工具 / 依赖 | 最低版本 | 推荐版本 | 约束来源 |
|---|---|---|---|
| [item-1] | [version-min] | [version-recommended] | [e.g. package.json engines / Dockerfile / docs] |
| [item-2] | [version-min] | [version-recommended] | [e.g. package.json engines / Dockerfile / docs] |
| [item-3] | [version-min] | [version-recommended] | [e.g. package.json engines / Dockerfile / docs] |
| [item-4] | [version-min] | [version-recommended] | [e.g. package.json engines / Dockerfile / docs] |
| [item-5] | [version-min] | [version-recommended] | [e.g. package.json engines / Dockerfile / docs] |

---

## 备注 / 说明

<!--
填写指引：
记录上述表格中未能涵盖的特殊说明。
例如：特定版本的已知问题、迁移计划、已弃用但仍保留的依赖等。
-->

- [YYYY-MM-DD] [note-content]
- [YYYY-MM-DD] [note-content]
