# Architecture: {{project-name}}

> **文档版本**：[YYYY-MM-DD]
> **分析范围**：{{analysis-scope}}
> **分析人员**：{{analyst}}

---

## 架构概览

<!--
填写指引：
用 2-3 段概括项目整体架构风格和分层策略。回答以下问题：
1. 采用什么架构模式（MVC / MVVM / 分层架构 / 六边形架构 / 微服务 / CQRS / 事件驱动 / 其它）？
2. 核心分为哪几层？每层的职责是什么？
3. 整体遵循哪些架构原则（依赖反转、单向数据流、领域驱动等）？
4. 项目从什么规模出发？是否预留了扩展方向？

示例：
本项目采用**分层架构**，分为展示层、应用层、领域层和基础设施层四层。
展示层负责 UI 渲染和用户交互，通过 ViewModel 与应用层通信。
应用层编排业务用例，协调领域对象完成操作。
领域层封装核心业务逻辑和规则，不依赖任何框架或基础设施。
基础设施层提供数据库、外部 API、文件系统等具体实现，通过接口与领域层解耦。
依赖方向严格遵循"外层依赖内层"原则，内层不感知外层。
-->

{{architecture-pattern-and-layers}}

### 分层职责矩阵

<!--
填写指引：
用表格列出各层/模块的名称、职责、依赖方向。

示例：
| 层级 | 职责 | 依赖方向 |
|------|------|----------|
| 展示层 (Presentation) | UI 渲染、用户输入处理、路由 | → 应用层 |
| 应用层 (Application) | 用例编排、事务管理、权限校验 | → 领域层 |
| 领域层 (Domain) | 核心业务逻辑、领域规则、实体 | → 自身（无外部依赖）|
| 基础设施层 (Infrastructure) | DB 访问、外部 API、消息队列 | → 领域层（通过接口）|
-->

| 层级/模块 | 职责 | 依赖方向 |
|-----------|------|----------|
| {{layer-1}} | {{layer-1-responsibility}} | {{layer-1-dependency}} |
| {{layer-2}} | {{layer-2-responsibility}} | {{layer-2-dependency}} |
| {{layer-3}} | {{layer-3-responsibility}} | {{layer-3-dependency}} |
| {{layer-4}} | {{layer-4-responsibility}} | {{layer-4-dependency}} |

### 风格约束

<!--
填写指引：
列出项目中需要遵守的架构风格约定，如果存在例外也一并记录。

示例：
- 跨层调用必须通过接口，禁止直接实例化下游实现
- 领域层禁止 import 任何框架/ORM/HTTP 相关包
- 异常统一使用 Result 类型返回，不抛 checked exception
- 跨模块引用需在 module-info.ts 中显式声明（依赖显式原则）
-->

- {{constraint-1}}
- {{constraint-2}}
- {{constraint-3}}

---

## 目录结构

<!--
填写指引：
列出项目关键目录的路径和用途。不需要穷尽每个文件，聚焦与架构相关的核心路径。
如果项目采用 monorepo，每个子包/模块分别列出。

示例：
```
src/
├── app/                    # 应用入口和全局配置
│   ├── main.ts             # 启动入口
│   ├── container.ts        # DI 容器配置
│   └── routes.ts           # 路由注册
├── domain/                 # 领域层
│   ├── entities/           # 领域实体
│   ├── value-objects/      # 值对象
│   └── services/           # 领域服务
├── application/            # 应用层
│   ├── use-cases/          # 用例
│   └── ports/              # 入站端口（接口定义）
├── infrastructure/         # 基础设施层
│   ├── persistence/        # 数据库实现
│   ├── api/                # 外部 API 客户端
│   └── messaging/          # 消息队列
├── presentation/           # 展示层
│   ├── components/         # UI 组件
│   ├── pages/              # 页面
│   └── hooks/              # 自定义 hooks
├── shared/                 # 跨层共享
│   ├── types/              # 公共类型定义
│   └── utils/              # 工具函数
└── config/                 # 环境配置
    ├── development.ts
    ├── production.ts
    └── test.ts
```
-->

```text
{{directory-tree}}
```

### 关键路径索引

| 路径 | 用途 | 包含内容 |
|------|------|----------|
| `{{path-1}}` | {{path-1-purpose}} | {{path-1-contents}} |
| `{{path-2}}` | {{path-2-purpose}} | {{path-2-contents}} |
| `{{path-3}}` | {{path-3-purpose}} | {{path-3-contents}} |
| `{{path-4}}` | {{path-4-purpose}} | {{path-4-contents}} |
| `{{path-5}}` | {{path-5-purpose}} | {{path-5-contents}} |

---

## 数据流

<!--
填写指引：
从端到端角度描述主要数据流，包括请求流和模块间依赖关系。
每个数据流写清楚：触发源 → 经过的模块 → 处理逻辑 → 结果去向。

如果项目有多个典型流程（用户请求、后台任务、事件推送等），分别描述。
-->

### 请求处理流

<!--
填写指引：
描述一次典型的外部请求如何穿越各层。
从请求进入系统到返回响应的完整链路。

示例：
1. HTTP 请求到达 Express 路由层
2. 中间件链依次执行（认证 → 鉴权 → 请求日志 → 限流）
3. 路由分发到对应的 Controller
4. Controller 解析参数并调用 Application 层的 UseCase
5. UseCase 编排领域对象完成业务逻辑
6. 若需持久化，通过 Repository 接口调用 Infrastructure 层
7. 结果逐层返回，Controller 组装 HTTP Response
8. 响应中间件执行（响应格式统一 → 日志记录）
-->

{{request-flow}}

### 模块依赖关系

<!--
填写指引：
用 ASCII 图或文本描述展示模块间依赖方向。关注核心模块边界。

示例：
```
┌─────────────┐     ┌─────────────────┐     ┌──────────────┐
│  Controller  │────>│   UseCase       │────>│   Domain     │
│  (路由)      │     │   (应用层)       │     │   (领域层)    │
└─────────────┘     └────────┬────────┘     └──────┬───────┘
                             │                     │
                     ┌──────▼────────┐    ┌────────▼───────┐
                     │  DTO / Mapper │    │  Repository    │
                     │  (数据转换)    │    │  (出站端口)     │
                     └───────────────┘    └────────┬───────┘
                                                   │
                                          ┌────────▼───────┐
                                          │ Infrastructure │
                                          │ (DB/API/队列)   │
                                          └────────────────┘
```
-->

```text
{{module-dependency-diagram}}
```

### 关键数据通道

<!--
填写指引：
列出项目中的关键数据传输通道及其特性。

示例：
| 通道 | 数据方向 | 传输方式 | 可靠性要求 | 延迟要求 |
|------|----------|----------|------------|----------|
| 用户请求 | 客户端 ↔ 服务端 | HTTP/REST | 可靠 | < 200ms |
| 异步任务 | 服务内 → Worker | 消息队列 | at-least-once | < 5min |
| 实时推送 | 服务端 → 客户端 | WebSocket | 允许丢包 | < 50ms |
| 事件广播 | 服务 → 各模块 | EventBus | at-most-once | < 100ms |
-->

| 通道 | 数据方向 | 传输方式 | 可靠性要求 | 延迟要求 |
|------|----------|----------|------------|----------|
| {{channel-1}} | {{channel-1-direction}} | {{channel-1-transport}} | {{channel-1-reliability}} | {{channel-1-latency}} |
| {{channel-2}} | {{channel-2-direction}} | {{channel-2-transport}} | {{channel-2-reliability}} | {{channel-2-latency}} |
| {{channel-3}} | {{channel-3-direction}} | {{channel-3-transport}} | {{channel-3-reliability}} | {{channel-3-latency}} |

---

## 关键抽象

<!--
填写指引：
列出项目中的核心接口、抽象类、类型定义，它们决定了模块之间的契约和边界。
不需要列出所有类型，只列出架构意义上的关键抽象（跨层接口、核心协议、工厂/提供者等）。
-->

### 端口与适配器

<!--
填写指引：
按六边形架构或分层架构的视角，列出入站端口（驱动端）和出站端口（被驱动端）的接口定义。
每个接口附简要说明和实现示例。

示例：

```typescript
// ========== 入站端口（应用层对外暴露的接口）==========

/** 用户查询服务 */
interface UserQueryService {
  findById(id: UserId): Promise<UserDTO | null>;
  search(criteria: UserSearchCriteria): Promise<PaginatedResult<UserDTO>>;
}

// ========== 出站端口（应用层依赖的接口）==========

/** 用户仓储接口 — 由基础设施层实现 */
interface UserRepository {
  findById(id: UserId): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: UserId): Promise<void>;
}

/** 事件发布器 — 由基础设施层实现 */
interface EventPublisher {
  publish<T>(event: DomainEvent<T>): Promise<void>;
}
```
-->

```typescript
{{port-and-adapter-interfaces}}
```

### 基类与抽象类

<!--
填写指引：
列出项目中作为扩展点的基类或抽象类。标注哪些方法需要子类实现（abstract），哪些提供了默认行为（protected virtual）。

示例：
| 抽象类 | 用途 | 抽象方法 | 默认行为 |
|--------|------|----------|----------|
| `BaseUseCase` | 所有用例的基类 | `execute()` | 事务管理、日志、异常处理 |
| `BaseController` | 所有控制器的基类 | 无 | 参数验证、响应封装、错误处理 |
| `BaseEntity` | 所有领域实体的基类 | `validate()` | ID 生成、Audit 字段填充 |
-->

| 抽象类 | 用途 | 需要子类实现 | 默认行为 |
|--------|------|-------------|----------|
| `{{base-class-1}}` | {{base-class-1-purpose}} | `{{base-class-1-abstract}}` | {{base-class-1-default}} |
| `{{base-class-2}}` | {{base-class-2-purpose}} | `{{base-class-2-abstract}}` | {{base-class-2-default}} |
| `{{base-class-3}}` | {{base-class-3-purpose}} | `{{base-class-3-abstract}}` | {{base-class-3-default}} |

### 核心类型与枚举

<!--
填写指引：
列出跨模块共享的核心值对象、枚举、联合类型。这些类型是多处引用的"语言核心"。

示例：
```typescript
/** 用户 ID 值对象 */
type UserId = string & { readonly __brand: 'UserId' };

/** 用户角色枚举 */
enum UserRole {
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer',
}

/** 操作结果类型 */
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/** 请求状态 */
type RequestStatus = 'idle' | 'loading' | 'success' | 'error';
```
-->

```typescript
{{core-types-and-enums}}
```

### 依赖注入 / 服务定位

<!--
填写指引：
描述项目中依赖注入的方式——使用什么 DI 框架 / 手动构造 / 服务定位器？
列出 DI 容器的配置位置和主要的生命周期管理策略。

示例：
- DI 框架：tsyringe（TypeScript 装饰器 + Reflection）
- 容器配置位置：src/app/container.ts
- 生命周期策略：UseCase 和 Repository 为 Singleton，Controller 为 Transient
- 模块注册方式：auto-register（通过 @injectable() 装饰器扫描）
- 跨模块依赖：各模块定义自己的 InjectionToken，在 container.ts 统一绑定
-->

{{dependency-injection-setup}}

---

## 入口点

<!--
填写指引：
列出系统所有的入口点（Entry Point）。入口点是系统启动或从外部被调用的位置。
包括主进程入口、CLI 命令、定时任务、消息消费者、Lambda Handler 等。
-->

| 入口文件 | 类型 | 用途 | 启动方式 |
|----------|------|------|----------|
| `{{entry-1-path}}` | {{entry-1-type}} | {{entry-1-purpose}} | {{entry-1-invocation}} |
| `{{entry-2-path}}` | {{entry-2-type}} | {{entry-2-purpose}} | {{entry-2-invocation}} |
| `{{entry-3-path}}` | {{entry-3-type}} | {{entry-3-purpose}} | {{entry-3-invocation}} |
| `{{entry-4-path}}` | {{entry-4-type}} | {{entry-4-purpose}} | {{entry-4-invocation}} |

### 启动顺序

<!--
填写指引：
描述系统启动时各模块的初始化顺序和依赖关系。如果存在初始化失败的处理策略，一并说明。

示例：
1. 加载环境配置（.env + 环境变量合并）
2. 初始化日志系统和错误报告
3. 连接数据库 → 执行 Migration
4. 注册依赖注入容器（扫描所有 @injectable() 装饰器）
5. 初始化消息队列消费者（注册 Handler）
6. 启动 HTTP 服务（端口绑定 → 路由注册 → Graceful Shutdown 监听）
7. 执行启动后初始化任务（缓存预热、定时器启动）
8. 标记服务为 Ready（健康检查端点返回 200）
-->

{{startup-sequence}}

---

## 架构决策记录索引

<!--
填写指引：
列出与架构相关的 ADR（Architecture Decision Record）的引用。每个 ADR 记录了一个重大的架构决策及其理由。
如果项目使用单独的 ADR 管理，提供索引和链接；如果没有 ADR，记录到 specwf 上下文中。
-->

| ADR | 决策内容 | 日期 | 状态 |
|-----|----------|------|------|
| {{adr-1-id}} | {{adr-1-title}} | [YYYY-MM-DD] | {{adr-1-status}} |
| {{adr-2-id}} | {{adr-2-title}} | [YYYY-MM-DD] | {{adr-2-status}} |
| {{adr-3-id}} | {{adr-3-title}} | [YYYY-MM-DD] | {{adr-3-status}} |

---

## 验证清单

<!--
填写指引：
完成分析后逐项确认。
-->

- [ ] 架构模式和分层逻辑已清晰描述
- [ ] 目录结构已索引关键路径
- [ ] 主要数据流已文档化（请求处理 + 模块依赖 + 关键通道）
- [ ] 跨层接口（端口 / 适配器）已识别并列出
- [ ] 基类和抽象类已列出，明确了扩展点
- [ ] 核心类型和枚举已记录
- [ ] 所有入口点已列出，启动顺序已描述
- [ ] 相关的 ADR 已索引
- [ ] 标注了架构中需要关注的风险区域和技术债
- [ ] 不确定的判断已标注 `[NEEDS_VERIFICATION]`
