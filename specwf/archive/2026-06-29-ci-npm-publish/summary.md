# Change Summary: ci-npm-publish

> **完成日期**: 2026-06-29
> **Change 类型**: config

---

## Intent

当前发布 npm 包需要手动 `npm publish`。每次里程碑发布时都应该自动发布到 npm。本变更为 CI 配置，目标是 GitHub Actions 在 `v*` tag push 时自动发布 npm 包。

## 产出文件

| 文件 | 操作 | 说明 |
|------|------|------|
| `.github/workflows/publish.yml` | 创建 | GitHub Actions workflow: tag push 触发 `npm ci` → `build` → `test` → `publish` |
| `package.json` | 修改 | 添加 `publishConfig.access = "public"` |

## 关键决策

- **NPM_TOKEN 作为唯一认证方式**: workflow 通过 `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` 传入 token，不在代码中存储凭证
- **registry-url 指向 npmjs.org**: `actions/setup-node@v4` 配置 `registry-url: "https://registry.npmjs.org"`，明确发布目标源
- **--access public**: publish 命令显式指定 `--access public`，与 package.json 的 publishConfig 双重保障
- **v* tag 触发**: 采用宽松的 `tags: ["v*"]` 匹配，兼容 `v1.2.3` / `v1.2.3-beta.1` 等格式
- **不涉及版本号 bump**: tag 即版本号，CI 不自动修改 package.json 版本

## 验证结果

| 检查项 | 结果 |
|--------|------|
| tsc --noEmit | ✅ 0 errors |
| vitest run | ✅ 79/79 passed |
| npm run build | ✅ 65.35KB |
| publish.yml 触发条件: push tags v* | ✅ |
| workflow steps 完整性 | ✅ checkout → setup-node → npm ci → build → test → publish |
| NODE_AUTH_TOKEN 引用 secrets.NPM_TOKEN | ✅ |
| package.json publishConfig.access = "public" | ✅ |
