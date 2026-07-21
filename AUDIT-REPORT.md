# Blueprint v2 项目审查报告与优化方案

> 审查日期：2026-07-21
> 审查范围：代码质量、项目架构、流程设计、输出模板、步骤提示词、子代理提示词
> 审查方法：全量源码阅读（src/ 17 命令 + core 模块 + templates + integrations）+ 测试覆盖扫描 + 设计文档对比

---

## 一、缺陷清单（按严重度分级）

### 🔴 P0 — 严重缺陷（需立即修复，影响正确性/一致性）

| # | 位置 | 缺陷 | 影响 |
|---|------|------|------|
| 1 | `bp/conventions/coding.md` 全文 | **从游戏项目复制而来**：提到 "game rules"、"Canvas, UI, visual output"、"Level data, level loader"、"Keyboard, touch, event handling" 等游戏领域 scope，与 Blueprint CLI 项目完全无关 | 注入到所有子代理后，executor 会按游戏项目惯例实现 CLI 代码，产生错误命名和结构 |
| 2 | `src/commands/bp-archive.ts` vs `src/templates/workflows/archive.ts` | **职责模式分裂**：plan/apply/review 命令只输出工作流指令让编排者执行；但 archive 命令直接执行归档（delta-merge + 文件移动 + roadmap 更新），同时 archive 工作流指令又描述了相同步骤的手动版本 | 两套逻辑重复且可能不同步；编排者读工作流指令做手动操作，与命令自动执行冲突 |
| 3 | `src/templates/workflows/plan.ts:38` | **路径 typo**：`"change_specs/<domain>/spec.md"` 应为 `"specs/<domain>/spec.md"`，该 typo 已传播到三平台 snapshot | planner 子代理读到错误路径，可能写错文件位置 |
| 4 | `src/core/delta-merge.ts:279-304` | **tryLineMerge 重排序数据丢失**：行级合并只检查"delta 删除了 base 的行"，若需求被重排序（B、C 互换），`removedFromBase` 为空，合并结果只追加不删除，丢失重排序意图；且 `deltaLines.includes(l)` 是 O(n²) | 归档时 spec 合并可能静默丢失意图，破坏真相源 |
| 5 | `src/core/continue.ts:236-262` | **FAIL vs NEEDS_REVISION 不区分**：`reviewVerdict !== 'PASS'` 分支中，FAIL（架构性失败）和 NEEDS_REVISION（需修订）走同一路由；仅凭 `hasDesignIssues` 决定 plan--fix 还是 apply--fix，未处理 spec 修订场景 | review 后 fix 路由可能错误：spec 问题被当成代码问题送到 apply--fix，或架构问题被当成代码问题 |
| 6 | `src/templates/agents/index.ts` REVIEWER_PROMPT | **"## Output" 标题位置错乱**：`## Output` 标题下接的是 `## Context Re-validation`，真正的输出说明 "Single file: review.md..." 夹在中间 | reviewer 子代理结构理解混乱，可能遗漏 Context Re-validation 步骤 |

### 🟡 P1 — 中等缺陷（影响可维护性/健壮性）

| # | 位置 | 缺陷 | 影响 |
|---|------|------|------|
| 7 | `bp-plan.ts:68`/`bp-apply.ts:51`/`bp-review.ts:86`/`bp-archive.ts:44` | **gateContextJsonl 重复 ×4**：四份几乎相同的实现，plan/apply/review 三份完全一致，archive 硬编码 'archive' | ~40 行重复代码，修改需改 4 处 |
| 8 | `bp-review.ts:67` + `bp-archive.ts:25` | **resolveChangeName 重复 ×2**：两份文本完全一致 | 同上 |
| 9 | 9 个命令文件 | **`register(program: any)` 类型缺失**：54% 命令用 any 而非 `Command` 类型（bp-config/propose/review/archive/dispatch/list/commit/continue/init） | 失去类型安全，命令选项定义错误无法在编译期发现 |
| 10 | `src/core/artifact-validator.ts:64-65` | **hasSection 正则宽松**：`new RegExp(\`^##\\s+${sectionPattern}\`, 'm')` 未锚定行尾，`Intent` 会匹配 `## Intentional Design` | 校验可能误判制品合格 |
| 11 | `src/core/continue.ts:100-102` | **review_pass 完成条件过宽**：仅检查 verdict 为 PASS，不校验 unresolved issues 计数；若 review.md 写 "PASS" 但有未勾选 issue 仍认为完成 | archive 可能放行未真正通过的 review |
| 12 | `src/core/config.ts:89-107` | **migrateConfig 丢失 brownfield 标志**：从 v1 迁移时硬编码 `brownfield: false`，未读取旧字段 | 存量 brownfield 项目迁移后失去配置 |
| 13 | `src/core/schema.ts:87-94,114-122` | **绕过 Zod 重复解析 config.yaml**：loadSchema/getSchemaDir 各自 readFileSync + yaml parse，不走 loadConfig，无缓存无默认值 | 配置不一致风险 + 性能浪费 |
| 14 | `src/core/spec-injector.ts:347-349` | **payload 超限直接 throw**：`formatContextCompact` 超过 4096 字节硬崩溃，应截断或 warning | OMP 扩展注入时可能整体失败 |
| 15 | `src/core/git-doc.ts:42-45` | **execFileSync 异常捕获错读 stderr**：catch 中读 `e.message` 而非 `ExecException.stderr`，`stderr.includes('nothing to commit')` 查的是 message 属性 | "nothing to commit" 判断可能漏判或误判 |
| 16 | `src/templates/workflows/init.ts` | **缺少 ORCHESTRATOR_RULE**：init 在 Step 3 派发 codebase-scanner 子代理，但无 orchestrator 规则前缀 | 编排者可能自己做扫描而非派发子代理 |
| 17 | `src/templates/workflows/shared.ts:8,20` | **死导出**：`CHANGE_NAME_RESOLVE` 和 `CLASSIFY_CHANGE` 导出但无人导入 | 混乱 + 维护负担 |
| 18 | `src/commands/bp-config.ts:34-49` | **configSet 原地变异后验证**：先修改已加载 config 对象再 Zod 验证，验证失败但原始对象已变异 | 配置可能处于不一致状态 |
| 19 | `src/commands/bp-template.ts:97-99` | **死代码**：`fullDir !== targetDir` 检查对当前 FILENAMES 映射永远为 false | 混乱 |
| 20 | `src/commands/bp-dispatch.ts:97` | **不一致的路径解析**：用 `join(process.cwd(), options.dir)` 而非 findBpDir()，与其他命令不一致 | 在子目录运行时行为异常 |
| 21 | `src/integrations/claude-code/agents.ts:20` | **CC agent 硬编码 model: opus/sonnet**：不适用于非 Claude runtime | 平台移植性差 |
| 22 | 三平台 agent 定义 | **平行定义不同步**：CC 硬编码 opus/sonnet，OMP 用 config，agent 平台无 model 字段；agent/skills.ts 替换 $ARGUMENTS 为 [BP:CHANGE_NAME] 而 OMP/CC 不替换 | 三平台运行时行为差异 |
| 23 | `src/templates/omp/extension.tmpl.ts` vs `extension-runtime.ts` | **双维护风险**：内联 ES5 代码与可测试 TS 版逻辑相同但实现不同（execSync vs 导入） | 修改一处易忘另一处 |
| 24 | `src/core/delta-merge.ts:241-248` | **REMOVED 行级解析正则不健壮**：`line.match(/### Requirement:\\s*(.+?)(?:['?]\\s*[-)]|$)/)` 若名称含 `-` 或 `)` 会截断 | REMOVED 需求匹配失败 |
| 25 | `src/core/artifact-validator.ts:175-177` | **RFC2119 关键词检测宽松**：`\\b(SHALL|MUST|SHOULD|MAY)\\b` 匹配注释内、代码块内的关键词 | 校验可能误判 spec 合格 |
| 26 | `CONFIG_TEMPLATE` context 字段 | **语言矛盾**：模板有 `{{response-language}}` 占位符，实际 config 写 `Language: English`，但全局 AGENTS.md 要求中文回复 | 子代理语言行为不一致 |

### 🟢 P2 — 轻微缺陷（代码质量/一致性）

| # | 位置 | 缺陷 |
|---|------|------|
| 27 | `src/commands/_utils.ts` | `findBlueprintDir` 与 `findBpDir` 命名不统一（一个 'Blueprint' 一个 'Bp'），行为也不同 |
| 28 | `src/commands/bp-archive.ts:1-10` | 注释步骤编号错误：缺 Step 1，Step 4 出现两次 |
| 29 | `src/templates/workflows/propose.ts:5` | `$ARGUMENTS` 标注 required，其他工作流标注 optional，不一致 |
| 30 | `src/templates/workflows/archive.ts` | 缺乏结构化输出格式段，不同于 propose/plan/apply；review.ts 输出嵌入 verdict 分块内无标准 `Next:` 行 |
| 31 | `src/core/continue.ts:95-104` | `file_exists` completion 类型死代码：DEFAULT_SCHEMA 中无 step 使用 |
| 32 | `src/core/brownfield.ts:105-111` | runBrownfieldInit 参数 rootDir/bpDir/info 未使用，不完整重构残留 |
| 33 | `src/core/file-tree.ts:12-18` | `createBlueprintStructure` 创建空 `bp/schemas/` 目录，默认 schema 内嵌时无意义，可能困惑用户 |
| 34 | `src/core/spec-injector.ts:331-333` | `formatContextCompact` rules 行标签写死 `artifact:` 前缀，应显示 `${rule.artifact}: ${rule.text}` |
| 35 | `src/core/delta-merge.ts:107-111` | ADDED 重复声明静默跳过，依赖 conflict 阻断，但 conflict 在上层可能被忽略 |
| 36 | `src/integrations/omp/commands.ts:22` | 注释写"22 step definitions"实际只有 10 个 |
| 37 | `src/templates/spec-stacks/index.ts` | 仅 5 种技术栈（TS CLI, React, Python API, Rust CLI, Go Service），缺 Node 后端/Vue/Svelte/Angular/Java/Swift/C#/Ruby/PHP |
| 38 | `tests/commands/bp-context.test.ts` | 字节级快照测试，脆弱性高 |
| 39 | `tests/core/artifact-validator.test.ts` | 覆盖率极低，仅单一 context.jsonl 入口测试 |

### ➕ 附加发现（审查深化中追加，P1 级）

| # | 位置 | 缺陷 | 影响 |
|---|------|------|------|
| 40 | `src/commands/bp-dispatch.ts:50` | **ROLE_TEMPLATES['reviewer'] 引用不存在的模板 ID**：列了 `['spec-review','quality-review','goal-review']`，但 `ARTIFACT_TEMPLATES` 里无此三 ID（reviewer 只产 review.md） | dispatch 输出引用无法解析的模板 |
| 41 | `src/integrations/agent/skills.ts:14-35` | **$ARGUMENTS 手动替换多余**（若 .agent 原生支持）：OMP/CC 不替换靠运行时原生替换，agent 平台却 replaceAll 成 `[BP:CHANGE_NAME]`，引入平台特定变量 | 三平台行为不一致 |

---

## 二、设计与实现偏差（文档债）

`DESIGN-v2.md` 声称的"缩减"与实际实现严重失配，文档落后于持续重构：

| 维度 | DESIGN-v2 声称 | 实际实现 | 偏差 |
|------|--------------|---------|------|
| 命令数 | 从 25 缩减到 **8** | **17** 个注册命令 | +9 个未文档化命令（commit/template/list/dispatch/config/context/state/update/schema） |
| 工作流 | 从 25 缩减到 **8 步** | registry 有 **10 个** | +ff（快进）、+loop（全自动）两个未文档化工作流 |
| 制品模板 | 从 27 缩减到 **6** | **8 个** | +config 模板、+global_spec 模板 |
| 子代理 | **3 个** | **4 个** | +codebase-scanner 未在文档中提及 |

**根因**：设计文档是 2026-07-16 的"设计提案"，但此后持续迭代（context.jsonl 机制、OMP 扩展自动注入、ff/loop 自动化、codebase-scanner）均未回写文档。

---

## 三、优化方案

### 方案 A：修复 P0 严重缺陷（立即执行，1-2 天）

#### A1. 重写 `bp/conventions/coding.md`
当前文件是游戏项目残留。需基于 Blueprint 实际技术栈重写：
- Language: English（prose/comments）/ 与 config 的 response-language 对齐
- TypeScript: strict mode、ESM、ES2022、`@/` path alias
- Naming: kebab-case 源文件、lowercase markdown、camelCase 变量、PascalCase 类型、UPPER_SNAKE_CASE 常量、kebab-case CLI 命令
- Testing: Vitest、`*.test.ts` co-located、TDD for behavior
- Git: Conventional Commits、scope 列表应匹配 Blueprint（core/cli/core/parser/templates/integrations/commands/docs/config）而非游戏 scope（render/input/level/shell）
- 删除游戏相关 scope（render/input/level/shell）

#### A2. 重写 archive 工作流为"运行命令 + 验证检查清单"模式
**决策**：命令直接执行归档是对的（保留），问题在工作流与命令重复。archive.ts 工作流当前 Step 2-5 手动描述了命令已做的操作（读 review.md、merge delta specs、mv 文件、更新 roadmap），与 `bp-archive.ts` archiveHandler 直接执行的逻辑冲突。正确做法是工作流改为"运行命令 + 验证结果"。
- `bp-archive.ts` 命令：**保留**完整执行（gate → review 验证 → delta-merge → roadmap 更新 → 文件归档）。命令不做 git commit（留给编排者）。
- `src/templates/workflows/archive.ts`：**重写**为验证型工作流：
  - Step 1: Resolve change name and paths（与其他工作流一致）
  - Step 2: 前置检查（可选预检，避免执行失败）：review.md 存在、verdict=PASS、无 `- [ ]` 未勾选 issue
  - Step 3: 运行 `bp archive $1`（命令完成 merge + 移动 + roadmap 更新）
  - Step 4: 验证归档成功（检查清单）：
    - `bp/changes/archive/<date>-<name>/` 目录存在且含完整制品（proposal/design/tasks/specs/review）
    - `bp/changes/<name>/` 目录已删除
    - 对每个 domain：`bp/specs/<domain>/spec.md` 已合并 —— ADDED 需求出现、REMOVED 需求消失、MODIFIED 已替换
    - 若 proposal 有 `## Roadmap Reference`：`bp/roadmap.md` 中该 change 标记为 `- [x]`
    - 命令输出无 conflict 报错（命令在 conflict 时 exit 1，但需确认）
  - Step 5: Commit 变更（命令不做 commit）：`bp commit "archive: $1 - specs merged, roadmap updated" --files bp/specs/ bp/roadmap.md bp/changes/`
  - Step 6: 建议下一步（`bp continue` 或 `bp propose <new>`）
- 删除 archive.ts 当前的手动 merge/mv/roadmap 步骤（Step 3-5）
- 风险：需同步调整 `tests/commands/bp-archive.test.ts` 和 snapshot

**设计依据**：plan/apply/review 工作流是"派发子代理"（需 fresh context 隔离），命令仅 gate+输出指令；archive 是纯确定性操作无需子代理，命令直接执行更可靠。不同步骤可有不同的命令/工作流关系，关键是**不重复，要互补**：命令做执行，工作流做编排+验证。

#### A3. 修复 plan.ts 路径 typo + 回归测试
- `src/templates/workflows/plan.ts:38`：`change_specs/` → `specs/`
- 更新三平台 snapshot（`tests/integration/__snapshots__/`）
- 加测试断言工作流指令不含 `change_specs` 字面量

#### A4. 修复 delta-merge 重排序丢失
- `src/core/delta-merge.ts` tryLineMerge：增加顺序感知——记录 delta 行的相对顺序，若 base 中对应行顺序与 delta 不一致，触发 conflict 而非静默合并
- 或更稳妥：REMOVED 检测改为"base 有但 delta 无"而非"delta 删除了 base 的行"，避免重排序被误判为无删除
- 加测试：重排序场景必须产生 conflict

#### A5. 区分 FAIL vs NEEDS_REVISION 路由
- `src/core/continue.ts` determineChangeNextStep：verdict 路由细化
  - `PASS` → archive
  - `NEEDS_REVISION` + hasDesignIssues → plan --fix（spec/架构问题）
  - `NEEDS_REVISION` + 无 hasDesignIssues → apply --fix（代码问题）
  - `FAIL`（D 类架构缺陷）→ plan --fix（强制重设计）
- 加测试覆盖三种 verdict 分支

#### A6. 修复 REVIEWER_PROMPT 结构
- `src/templates/agents/index.ts:510-520`：将 `## Context Re-validation` 移到 `## Output` 之前作为独立章节，`## Output` 下直接是 "Single file: review.md..." 说明

### 方案 B：消除代码重复 + 类型安全（2-3 天）

#### B1. 抽象 `gateContextJsonl` 到 util
- 新建 `src/commands/_context-gate.ts` 或放入 `src/core/artifact-validator.ts`
- 单一实现：`gateContextJsonl(bpDir, changeName, phase): boolean` + 一个 `exitOnFail` 包装
- 四个命令文件改为导入

#### B2. 抽象 `resolveChangeName` 到 util
- 放入 `src/commands/_utils.ts`
- review/archive 共用

#### B3. 修正所有 `register(program: any)` 为 `Command` 类型
- 全局替换 `program: any` → `program: Command`（commander 类型）
- 9 个文件批量修改

#### B4. schema.ts 走 loadConfig
- `loadSchema`/`getSchemaDir` 改为先 `loadConfig(bpDir)` 读 schema 名，再走自定义 schema 路径
- 统一 Zod 校验 + 缓存

### 方案 C：补齐文档与设计对齐（1 天）

#### C1. 更新 DESIGN-v2.md / README.md
- 命令数：8 → 17（列出所有命令及用途）
- 工作流：8 → 10（文档化 ff/loop 为"自动化包装器"）
- 制品模板：6 → 8（文档化 config/global_spec）
- 子代理：3 → 4（文档化 codebase-scanner）
- 或反向：若坚持 8 命令/3 代理的设计目标，则将 commit/template/list 等标记为"辅助命令"，ff/loop 标记为"实验性"

#### C2. 解决语言矛盾
- `CONFIG_TEMPLATE` 的 `{{response-language}}` 与 AGENTS.md "Must respond in Chinese" 冲突
- 决策：config 的 `Language` 字段应反映**制品语言**（English，因为 spec/设计文档用英文），而非**对话语言**（Chinese）
- 重命名字段为 `artifact-language` 或 `doc-language`，明确语义
- 或在 config 注释中说明："Language = prose/artifact language;对话语言由运行时 agent 配置决定"

### 方案 D：架构优化（中期，1-2 周）

#### D1. context-refs.ts 与 context-builder.ts 职责重命名
- `context-refs.ts` 实为"context.jsonl 数据访问层（parse/validate/render）"→ 重命名 `context-jsonl-io.ts`
- `context-builder.ts` 实为"从制品提取引用构造 context.jsonl"→ 保持
- 消除命名混淆

#### D2. OMP 扩展双维护消除
- `src/templates/omp/extension.tmpl.ts`（内联 ES5）与 `extension-runtime.ts`（可测试 TS）逻辑相同但实现不同
- 决策：让内联版通过构建时从 TS 版生成（codegen），消除手动同步
- 或：内联版只保留最小 bootstrap，其余逻辑运行时从生成产物加载

#### D3. 三平台 agent 定义统一
- 抽象 agent 定义到共享模板，平台差异通过参数注入
- model 字段：CC 用 opus/sonnet、OMP 用 config、agent 平台可选——统一为"model 配置可选，平台生成器按平台默认填充"
- $ARGUMENTS 替换：统一规则，要么三平台都替换，要么都不替换（推荐都不替换，由运行时解释）

#### D4. spec-stacks 扩展
- 当前仅 5 栈。补充：Node 后端（Express/Fastify）、Vue、Svelte、Angular、Java Spring、C# .NET、Ruby Rails、PHP Laravel
- 或提供"自定义 spec-stack 注册"机制，让用户贡献

### 方案 E：测试覆盖补强（中期，1 周）

#### E1. 补 artifact-validator 测试
- 当前仅单一 context.jsonl 入口测试
- 补：hasSection 各 section、PR-N/DS-N/T-N 检测、RFC2119 关键词、placeholder 检测、behavior task 正则边界

#### E2. 补 delta-merge 重排序/冲突测试
- 重排序场景必须 conflict
- ADDED 重复声明场景
- MODIFIED 头部不匹配场景
- REMOVED 名称含特殊字符场景

#### E3. 补 continue.ts verdict 路由测试
- PASS → archive
- NEEDS_REVISION + hasDesignIssues → plan --fix
- NEEDS_REVISION + 无 hasDesignIssues → apply --fix
- FAIL → plan --fix

#### E4. 降低 bp-context 快照脆弱性
- 字节级快照改为语义级断言（结构 + 关键字段）

### 方案 F：流程优化（现有步骤的加固，中期 1 周）

按生命周期阶段，针对现有步骤的加固（非新增步骤）：

#### F1. propose 阶段

| 编号 | 优化点 | 现状 | 建议 |
|------|--------|------|------|
| F1a | propose 缺 lightweight 路径 | plan/apply 有 lightweight/full 分类，propose 无 | 加 lightweight propose：fix-typo/bump-deps 类跳过 grill，直接据一句话填模板 |
| F1b | grill 与命令脱节 | `bp propose <name>` 命令只建目录+输出模板，grill 在工作流；直接跑 CLI 跳过 grill | 命令 gate 时提示"未跑工作流"，或命令强制走工作流指令 |

#### F2. plan 阶段

| 编号 | 优化点 | 现状 | 建议 |
|------|--------|------|------|
| F2a | context.jsonl 不随 design/tasks 演化 | planner Step 0 写一次，`plan --fix` 重做 design 后不重建 | plan 命令 `--fix` 后自动重跑 `--write-context` |

#### F3. apply 阶段

| 编号 | 优化点 | 现状 | 建议 |
|------|--------|------|------|
| F3a | wave 失败无升级 | "re-dispatch failed wave" 无次数上限 | 加 max-retries=2，耗尽后停下报告 blocker |
| F3b | 并发 wave 同文件冲突无处理 | isolated worktree 并发改同一文件，merge 冲突 | wave 分解时检测 File Manifest 重叠，重叠的强制串行化到同一 wave |

#### F4. review 阶段

| 编号 | 优化点 | 现状 | 建议 |
|------|--------|------|------|
| F4a | fix 循环无次数上限 | review→apply--fix→review 无限循环 | 加 max-fix-rounds=3，耗尽后升级 plan--fix 或停下问人 |

#### F5. archive 阶段

| 编号 | 优化点 | 现状 | 建议 |
|------|--------|------|------|
| F5a | 无 pre-archive 干净工作区检查 | archive 不查 git working tree | gate 加 `git status --porcelain` 检查（至少 warning） |
| F5b | 无回滚 | delta-merge 破坏性写回 global spec，中途 domain conflict 时已写部分 | archive 前对 global spec 做 git commit snapshot，失败可 reset（见 G2 dry-run） |

#### F6. continue 引擎

| 编号 | 优化点 | 现状 | 建议 |
|------|--------|------|------|
| F6a | 不检测 artifact 质量 | proposal.md 全 {{placeholder}} 也推进 | continue gate 调 `hasUnreplacedPlaceholders`（validator 已有，continue 未调） |
| F6b | 不检测代码实际实现 | tasks.md 全 [x] 即 implemented，不看 git diff | review gate 加 `git diff --stat` 非空检查 |

#### F7. 全局流程

| 编号 | 优化点 | 现状 | 建议 |
|------|--------|------|------|
| F7a | 多 change 间无依赖管理 | 无机制表达 change 间依赖 | proposal.md 支持 `Depends: <change>`，continue 在上游未 archive 时阻止下游 apply |
| F7b | brownfield spec 一次性 | codebase-scanner 只在 init 跑 | 新增 `bp spec refresh` 命令（见 G3） |
| F7c | 多平台产物无版本同步 | `bp update` 已有重新生成+清理 stale，但无 CLI 版本记录 | config 记录 `generator_version`，`bp update` 检测版本不匹配时提示 |
| F7d | roadmap 无结构校验 | archive 时正则更新，格式错误静默跳过 | `bp roadmap --validate` 或 archive gate 加结构校验 |

### 方案 G：缺失流程步骤（正常生命周期的步骤缺口，中期 1-2 周）

当前正式流程：`init → roadmap → propose → plan → apply → review → archive`（+ continue 贯穿，ff/loop 自动化包装）。
以下步骤填补正常生命周期的明确缺口：

#### G1. verify 步骤（apply → review 之间）⚠️ 高价值

**缺口**：apply 在 Step 4 末尾做全量 `tsc --noEmit && vitest run`，但混在 apply 里；失败后路由不清（重跑 wave？手动修？）。review 假设代码已集成验证，但无正式 gate。

**建议**：独立 `bp verify [name]` 步骤，做 orchestrator 级集成验证：
- `tsc --noEmit` 退出 0
- `vitest run`（全量）退出 0
- `git diff --stat` 非空（代码确实改了）
- 无未提交的 `<!-- commit: -->` 空 hash（tasks.md）
通过才允许进 review。失败路由：wave 级失败 → re-dispatch wave；集成级失败 → 报告 blocker。

**价值**：把"事后验证"提升为正式 gate，避免空壳代码进 review 浪费 reviewer 子代理。

#### G2. pre-archive dry-run 步骤（archive 前）⚠️ 高价值

**缺口**：archiveHandler 逐 domain `mergeDeltaSpec` + `writeFileSync(globalSpec)`，若 domain A 成功写回、domain B conflict 后 exit 1，**global spec 已被部分修改**（破坏性中途失败）。

**建议**：archive 加 `--dry-run` 或独立 `bp pre-archive [name]`：
1. 预演所有 domain 的 mergeDeltaSpec，**不写回**，只检测 conflict
2. 全部成功 → 输出"safe to archive"
3. 任一 conflict → 输出 conflict 详情，阻止 archive
4. 真正 archive 时再执行写回

**价值**：避免唯一的破坏性操作中途失败导致部分状态。与 F5b（global spec snapshot）配合形成双保险。

#### G3. spec refresh 步骤（brownfield 维护）

**缺口**：codebase-scanner 只在 `bp init`（brownfield=true）跑一次。代码演化后 `bp/specs/` 过时，新代码行为无 spec 覆盖。

**建议**：`bp spec refresh [domain]` 命令：
- 无参数：重扫全部 domain，与现有 `bp/specs/` diff，输出变更清单（不自动写）
- `[domain]`：只重扫指定 domain
- `--apply`：将 diff 写入 spec
复用 codebase-scanner 子代理，增量而非全量。

**价值**：保持 spec 真相源与代码同步，否则后续 change 的 delta spec 基于过时基线。

#### G4. rollback 步骤（archive 后异常恢复）

**缺口**：archive 是唯一不可逆操作（delta-merge 写回 + 删 change 目录）。archive 后发现 spec 合并破坏真相源，无 unarchive。

**建议**：`bp unarchive <date>-<name>` 或 `bp revert-archive <name>`：
1. 从 `bp/changes/archive/<date>-<name>/` 恢复 change 目录
2. 反向应用 delta spec（ADDED 删除、REMOVED 恢复、MODIFIED 回退）——依赖 delta-merge 的逆操作
3. roadmap 标记回退
**前置**：需 delta-merge 支持反向合并（当前不支持，需扩展）

**价值**：异常路径保护。配合 F5b（snapshot）可简化为 git reset。

#### G5. split 步骤（scope 管理闭环）

**缺口**：propose.ts 说 PR > 5 "suggest splitting"，但无实际机制。用户只能手动建新 change 重抄 proposal 片段。

**建议**：`bp split <source-change> <new-change> --prs PR-3,PR-4,PR-5`：
1. 从 source change 的 proposal/design/tasks 中提取指定 PR-N 及其关联的 DS-N、T-N
2. 在新 change 目录重建缩减版 proposal/design/tasks
3. source change 的 proposal/design/tasks 删除已移出的 PR/DS/T
4. 两者各自独立走 plan/apply/review

**价值**：让"suggest splitting"从建议变成可执行操作。

### 附加缺陷（本轮新发现）

| 位置 | 缺陷 | 严重度 |
|------|------|--------|
| `src/commands/bp-dispatch.ts:50` | `ROLE_TEMPLATES['reviewer']` 列了 `['spec-review','quality-review','goal-review']` 三个模板 ID，但 `ARTIFACT_TEMPLATES` 里不存在这三个 ID（reviewer 只产 review.md） | 中 |
| `src/integrations/agent/skills.ts:14-35` | `$ARGUMENTS`/`$1` 手动 replaceAll 成 `[BP:CHANGE_NAME]`，而 OMP/CC 不替换（原生支持）；若 .agent 也原生支持则此替换多余且引入平台特定变量 | 中 |

---

## 四、优先级排序与执行计划

| 优先级 | 方案 | 工时 | 依赖 |
|--------|------|------|------|
| **P0 立即** | A1 重写 coding.md | 2h | 无 |
| **P0 立即** | A3 修复 plan.ts typo + snapshot | 1h | 无 |
| **P0 立即** | A6 修复 REVIEWER_PROMPT 结构 | 0.5h | 无 |
| **P0 立即** | A4 修复 delta-merge 重排序 | 4h | E2 测试 |
| **P0 立即** | A5 区分 FAIL/NEEDS_REVISION 路由 | 3h | E3 测试 |
| **P0 立即** | A2 重写 archive 工作流为验证型 | 4h | 调整 bp-archive.test.ts |
| **P1 短期** | B1/B2 抽象重复函数（gate×4, resolve×2） | 2h | 无 |
| **P1 短期** | B3 修正 any 类型（9 命令） | 1h | 无 |
| **P1 短期** | B4 schema.ts 走 loadConfig | 2h | 无 |
| **P1 短期** | C2 解决语言矛盾（response-language） | 1h | 无 |
| **P1 短期** | 附加：bp-dispatch.ts ROLE_TEMPLATES 修正 | 0.5h | 无 |
| **P1 短期** | 附加：agent/skills.ts 删 $ARGUMENTS 替换（若 .agent 原生支持） | 0.5h | 确认 .agent 规范 |
| **P2 中期** | C1 更新设计文档（8→17 命令等） | 3h | 无 |
| **P2 中期** | E1-E4 测试补强 | 2d | 依赖对应修复 |
| **P2 流程** | F4a fix 循环 max-rounds + 升级 | 3h | 无 |
| **P2 流程** | F3a wave 失败 max-retries | 2h | 无 |
| **P2 流程** | F6a continue 加 placeholder gate | 1h | 无 |
| **P2 流程** | F2a plan --fix 后重建 context.jsonl | 1h | 无 |
| **P2 流程** | F1a propose lightweight 路径 | 3h | 无 |
| **P2 流程** | F3b wave 文件 manifest 重叠检测 | 3h | 无 |
| **P2 流程** | F5a archive 前干净工作区检查 | 1h | 无 |
| **P2 流程** | F7d roadmap 结构校验 | 2h | 无 |
| **P2 流程** | F7a change 间依赖管理 | 4h | 无 |
| **P3 缺失步骤** | G1 verify 步骤（apply→review gate） | 1d | 新命令+工作流 |
| **P3 缺失步骤** | G2 pre-archive dry-run（含 F5b snapshot） | 1d | delta-merge 扩展 |
| **P3 缺失步骤** | G3 spec refresh 命令（brownfield） | 1d | 复用 codebase-scanner |
| **P3 缺失步骤** | G5 split 命令（scope 管理） | 1d | 无 |
| **P3 缺失步骤** | G4 unarchive/revert（需 delta-merge 逆操作） | 2d | delta-merge 扩展逆操作 |
| **P3 架构** | D1 重命名 context 模块 | 1h | 无 |
| **P3 架构** | D2 OMP 扩展双维护消除 | 1d | 构建系统改造 |
| **P3 架构** | D3 三平台 agent 统一（含 agent/skills.ts） | 1d | 无 |
| **P3 架构** | D4 spec-stacks 扩展 | 2d | 无 |

**总工时估算**：P0 约 15h（2 天），P1 约 7h，P2（文档+测试+流程加固）约 5d，P3（缺失步骤+架构）约 8d。全量约 3 周。

**分阶段交付建议**：
- **第 1 周**：P0 全部 + P1 → 修复正确性问题，项目可用
- **第 2 周**：P2 流程加固（F4a/F3a/F6a 优先，防 AI 空转）+ P2 文档/测试
- **第 3 周**：P3 缺失步骤（G1/G2 优先，填生命周期缺口）+ P3 架构

---

## 五、核心建议总结

1. **coding.md 是最紧迫问题**——它直接污染所有子代理的代码生成。立即重写。
2. **archive 工作流与命令重复**——命令直接执行是对的，工作流应重写为"运行命令 + 验证检查清单"，删掉手动 merge/mv/roadmap 步骤。
3. **delta-merge 重排序丢失**是潜在的数据完整性 bug，可能在任意归档时静默破坏 spec 真相源。
4. **FAIL/NEEDS_REVISION 路由不分**导致 fix 循环可能走错路径，浪费子代理派发。
5. **fix 循环无次数上限**（F4a）是导致 AI 无限空转烧 token 的最危险流程缺陷——加 max-rounds + 升级机制最优先。
6. **缺失 verify 和 pre-archive dry-run 两个正常步骤**（G1/G2）——apply→review 之间无集成 gate，archive 前无破坏性操作预演，填补这两个缺口直接关联 P0 缺陷。
7. **文档与实现偏差**（8→17 命令、3→4 代理、6→8 模板）不是 bug 但会误导用户和贡献者，需回写。
8. **gateContextJsonl ×4 重复**是最容易修的 DRY 违例，顺手解决。
9. **三平台生成器平行定义**是长期维护债，统一前会持续不同步；agent/skills.ts 的 $ARGUMENTS 替换多半多余。

**执行节奏**：第 1 周 P0+P1（修复正确性）→ 第 2 周 P2 流程加固（防 AI 空转优先：F4a/F3a/F6a）+ 文档/测试 → 第 3 周 P3 缺失步骤（G1/G2 优先）+ 架构。全量约 3 周。
