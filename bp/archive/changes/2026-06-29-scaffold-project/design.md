# Design: scaffold-project

## 目标

搭建 blueprint CLI 的 npm 项目骨架，可编译、可运行 `blueprint --version`。

## 技术决策

（参见 context.md D2-D5，此处只列实现要点）

- 构建工具: tsup ^8，ESM 输出 + dts + shebang banner
- TypeScript: strict, ES2022, moduleResolution bundler
- 测试: vitest ^3
- CLI 框架: commander ^14（Phase 1 仅注册 --version）
- 入口: bin/blueprint.js → import ../dist/cli.js

## 文件清单

| 文件 | 内容 |
|---|---|
| package.json | name/bin/scripts/dependencies/devDependencies/engines/files |
| tsconfig.json | strict ES2022 + paths @/* |
| tsup.config.ts | format esm + dts + banner shebang |
| vitest.config.ts | environment node |
| bin/blueprint.js | shebang 入口，import ../dist/cli.js |
| src/cli.ts | commander program，仅注册 --version |
