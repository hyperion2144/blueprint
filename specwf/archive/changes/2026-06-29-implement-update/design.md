# Design: Update 命令

## 目标

实现 `specwf update` 命令，读取 project.yml → 调度生成器 → 写入 .omp/commands/ + .omp/agents/ 文件。

## 文件

src/commands/specwf-update.ts
