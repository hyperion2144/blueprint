# Design: ci-npm-publish

---

## 背景与目标

当前 npm publish 需手动执行。GitHub Actions 在 tag push 时自动发布。

## 技术方案

### 文件清单

| 文件 | 操作 |
|------|------|
| `.github/workflows/publish.yml` | 创建 |
| `package.json` | 添加 publishConfig |

### Workflow

```yaml
name: publish
on:
  push:
    tags: ["v*"]
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, registry-url: "https://registry.npmjs.org" }
      - run: npm ci
      - run: npm run build
      - run: npm test
      - run: npm publish --access public
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```
