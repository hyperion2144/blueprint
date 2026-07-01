# Proposal: ci-npm-publish

---

## Intent

当前发布 npm 包需要手动 `npm publish`。每次里程碑发布时都应该自动发布到 npm。

本变更为 CI 配置，目标是 GitHub Actions 在 tag push 时自动发布 npm 包。

---

## Scope

### In scope

- 创建 `.github/workflows/publish.yml`：当 `v*` tag 被 push 时触发
- 流程：`npm ci` → `npm run build` → `npm test` → `npm publish`
- 使用 `npm publish --provenance`（需 `NPM_TOKEN` secret 或 `--access public`）
- 在 `package.json` 中确认 `publishConfig.access = "public"`

### Out of scope

- 不涉及 npm 账号配置（用户需自行设置 `NPM_TOKEN` secret）
- 不修改现有的 `prepublishOnly` script
- 不涉及 GitHub Release 自动创建

---

## Must-haves

- `git push --tags` 推送 `v*` tag 时触发 CI
- CI 运行 `npm test` 全部通过后发布
- 发布的包版本号与 tag 一致

---

## Non-goals

- 不自动 bump 版本号
- 不自动创建 GitHub Release
