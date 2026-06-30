# 初始化项目

运行 `specwf init` 创建 specwf/ 目录结构 + platform.yml + state.md。

## 存量项目

已有代码的项目使用 brownfield 模式：

```bash
specwf init --brownfield
```

CLI 创建目录结构后，**agent 需使用 task 子代理并行执行以下任务**：

1. **Codebase Mapping**— 分析技术栈、模块结构、依赖关系
   - 产出: `specwf/research/stack.md`、`architecture.md`、`pitfalls.md`、`summary.md`
2. **Spec Bootstrap**— 从核心模块提取行为契约
   - 产出: `specwf/specs/<domain>/spec.md`（标记 `BOOTSTRAPPED`）

使用 task 工具 fan-out 两个 specwf-researcher 并行执行。

## 上下文

```bash
specwf context init
specwf state
```

可参考 @specwf/conventions/coding.md。

## 下一步

完成后：

```bash
specwf continue
```
