# Tasks: CLI 命令层

## 1. 核心命令（4 个）
- [ ] 1.1 src/commands/blueprint-init.ts — init 命令
- [ ] 1.2 src/commands/blueprint-update.ts — update 命令
- [ ] 1.3 src/commands/blueprint-config.ts — config / config set
- [ ] 1.4 src/commands/blueprint-state.ts — state 命令

## 2. 工作流命令（3 个）
- [ ] 2.1 src/commands/blueprint-context.ts — context <step>
- [ ] 2.2 src/commands/blueprint-continue.ts — continue
- [ ] 2.3 src/commands/blueprint-archive.ts — archive <change>

## 3. 辅助命令（2 个）
- [ ] 3.1 src/commands/blueprint-list.ts — list
- [ ] 3.2 src/commands/blueprint-template.ts — template <type>

## 4. 向导 + 入口
- [ ] 4.1 src/prompts/init-wizard.ts — init 交互向导
- [ ] 4.2 更新 src/cli.ts — 注册所有子命令

## 5. 验证
- [ ] 5.1 node bin/blueprint.js --help 显示所有子命令
- [ ] 5.2 tsc --noEmit 通过
- [ ] 5.3 vitest run 通过
