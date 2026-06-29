# Design: integration-tests

## 目标

端到端集成测试：init → 创建 change → plan → archive 完整流程验证。

## 文件

| 文件 | 内容 |
|---|---|
| tests/integration/e2e.test.ts | init→template→archive 端到端测试 |

## 测试场景

1. init 创建项目结构 + project.yml + state.md
2. update 生成 34 个平台文件
3. template proposal 生成 proposal.md
4. template design 生成 design.md
5. template tasks 生成 tasks.md
6. 创建 delta-spec → archive → 验证 specs/ 合并
7. continue 输出正确下一步
8. list 输出里程碑树
