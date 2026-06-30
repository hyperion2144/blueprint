# Change Summary: fix-generator-architecture

## 描述

修复生成器架构：模板文件化 + 产物模板体系 + OMP 格式合规

## 产出文件

- `src/generators/omp-commands.ts (重写)`
- `src/generators/omp-agents.ts (重写)`
- `src/generators/skills.ts (重写)`
- `src/generators/index.ts (重写)`
- `src/commands/specwf-template.ts (重写)`
- `tsup.config.ts (更新)`
- `src/public/templates/commands/*.md (14 个)`
- `src/public/templates/agents/*.md (6 个)`
- `src/public/templates/skills/*.md (14 个)`
- `src/public/templates/artifacts/*.md (12 个)`

## 验证

- [x] tsc --noEmit 通过
- [x] vitest run 通过
