# Tasks: 修复 CLI 参数和自动发现

## 1. state 命令 — 添加 set 子命令
- [ ] 1.1 specwf state set-milestone <id>
- [ ] 1.2 specwf state set-phase <id>
- [ ] 1.3 specwf state set-step <step>

## 2. 更新命令模板 — 参数 + 自动发现
- [ ] 2.1 更新 discuss/roadmap/research-phase/split 模板：添加 $1 参数
- [ ] 2.2 更新 continue 模板：添加无下一步时的引导

## 3. 验证
- [ ] 3.1 tsc + vitest
- [ ] 3.2 specwf state set-milestone m2 测试
- [ ] 3.3 specwf continue 验证
