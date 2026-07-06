# Research Summary: m2-claude-code

## 推荐方案

**Pattern**: Platform Strategy + Provider Interface。
`src/generators/index.ts` 扩展为平台路由器，每个平台独立实现 provider interface，共享 `src/templates/workflows/` 模板。

## 三个维度结论

### Tech Stack (stack.md)
- **平台抽象**: Provider interface per `src/integrations/<platform>/`，新增 `src/core/platform-registry.ts` 管理注册
- **Claude Code 格式**: `.claude/commands/` + `.claude/agents/`，frontmatter 用 TOML/YAML 适配
- **`.agent/` 格式**: `.agent/skills/` + `.agent/agents/`，参数用 `[BP:xxx]`，复用 WORKFLOW_REGISTRY 模板
- **实现阶段**: 4 阶段 — (1) Provider interface + registry (2) Claude Code renderer (3) .agent/ renderer (4) 测试 + 文档

### Architecture (architecture.md)
- **模式**: Platform Strategy Pattern（Strategy > Template Method > Registry-only）
- **核心变更**: `generators/index.ts` 改为 `generateAll(config)` 遍历 `config.platform` 调度
- **8 项关键决策**: 包括文件路径映射、frontmatter 差异化渲染、共享模板的 post-processing
- **兼容性**: OMP 零改动，`supportsCommands` 从模块级常量为 per-integration flag

### Pitfalls (pitfalls.md)
- **10 项风险**, **7 个反模式**, **7 个边缘案例**
- **最高风险**: OMP 生成变更破坏已有项目（要求零行改动 `src/integrations/omp/`）
- **关键技术风险**: `.agent/skills/` 的 `[BP:xxx]` 占位符是静态文件中的文本，`expandTemplateVars()` 在 bp continue 输出时替换——但 skill 文件是独立生成的，替换时机需确认
- **推荐**: 每个平台做 golden-file snapshot 测试，防止输出漂移
- **Claude Code**: 用 `.claude/skills/` 而非 `.claude/commands/`，对齐 `.agent/skills/`

## 实施路径

```
Phase 1: Provider interface + Registry
  - src/core/platform-registry.ts
  - generator/index.ts 改为 dispatch 模式
  - OMP 注册为第一个 provider（零行为变更验证）

Phase 2: Claude Code provider
  - src/integrations/claude-code/
  - commands.ts + agents.ts
  - 文件路径映射 .claude/

Phase 3: .agent/ provider
  - src/integrations/agent/
  - skills.ts + agents.ts（skill 格式，[BP:xxx] 参数）
  - 文件路径映射 .agent/

Phase 4: 测试 + project.yml 适配
  - golden-file tests per platform
  - project.yml platform 数组支持
  - 集成测试：全部三个平台同时生成
```

## 实现预估

| Phase | 文件数 | 复杂度 | 风险 |
|-------|--------|--------|------|
| 1 — Provider interface | 3-4 | Medium | 低（OMP 零改动） |
| 2 — Claude Code | 3-4 | Medium | 中（格式摸索） |
| 3 — .agent/ | 3-4 | Medium | 中（参数替换时机） |
| 4 — 测试 | 4-5 | Low | 低 |
