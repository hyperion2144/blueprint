# Tasks: scaffold-project

## 1. 项目配置文件
- [ ] 1.1 创建 package.json（type: module, bin, scripts, deps）
- [ ] 1.2 创建 tsconfig.json（strict ES2022）
- [ ] 1.3 创建 tsup.config.ts（esm + dts + banner）
- [ ] 1.4 创建 vitest.config.ts

## 2. CLI 入口
- [ ] 2.1 创建 bin/blueprint.js（shebang 入口）
- [ ] 2.2 创建 src/cli.ts（commander + --version）

## 3. 验证
- [ ] 3.1 npm install 成功
- [ ] 3.2 npm run build 成功（dist/cli.js + .d.ts）
- [ ] 3.3 node bin/blueprint.js --version 打印版本号
