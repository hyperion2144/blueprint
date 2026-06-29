/**
 * OMP 命令生成器
 * 生成 .omp/commands/specwf-<step>.md 文件（14 个 slash command）
 *
 * 模板文件存储在 src/templates/commands/<step>.md，支持 {{step}}/{{description}} 占位符。
 * 对于未覆盖的步骤（fallback），使用模板变量渲染通用 body。
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProjectConfig } from '../types/index.js';

export interface CommandDef {
  step: string;
  name: string;
  description: string;
  usesAgent: boolean;
  agents: string[];
  bodyOverride?: string;
}

/** 14 个步骤定义 */
export const STEP_DEFS: CommandDef[] = [
  { step: 'init', name: 'specwf:init', description: '初始化 specwf 项目结构', usesAgent: true, agents: ['researcher'] },
  { step: 'grill', name: 'specwf:grill', description: '需求探讨 — 无限制细节提问直到达成共识', usesAgent: false, agents: [] },
  { step: 'research', name: 'specwf:research', description: '项目技术调研 — 并行多方向调研', usesAgent: true, agents: ['researcher'] },
  { step: 'roadmap', name: 'specwf:roadmap', description: '路线图 — 拆分 Milestone × Phase', usesAgent: false, agents: [] },
  { step: 'milestone', name: 'specwf:milestone', description: '里程碑管理 — 切换/创建 Milestone', usesAgent: false, agents: [] },
  { step: 'discuss', name: 'specwf:discuss', description: 'Phase 讨论 — 捕获实现决策', usesAgent: false, agents: [] },
  { step: 'research-phase', name: 'specwf:research-phase', description: 'Phase 调研 — 实现路径研究', usesAgent: true, agents: ['researcher'] },
  { step: 'split', name: 'specwf:split', description: 'Change 拆分 — 依赖图 + N 个 Change', usesAgent: false, agents: [] },
  { step: 'adhoc', name: 'specwf:adhoc', description: '临时 Change — 与 milestone/phase 无关的独立变更', usesAgent: false, agents: [] },
  { step: 'plan', name: 'specwf:plan', description: 'Change 设计 — design+tasks+delta-specs', usesAgent: true, agents: ['planner'] },
  { step: 'apply', name: 'specwf:apply', description: '代码实现 — TDD RED→GREEN→REFACTOR', usesAgent: true, agents: ['executor'] },
  { step: 'review', name: 'specwf:review', description: '三重审查 — 规格/质量/目标并行', usesAgent: true, agents: ['reviewer'] },
  { step: 'verify', name: 'specwf:verify', description: '测试验证 — 诊断+路由回环', usesAgent: true, agents: ['verifier'] },
  { step: 'archive', name: 'specwf:archive', description: '归档 — delta 合并 + 代码认知回灌', usesAgent: false, agents: [] },
  { step: 'ship', name: 'specwf:ship', description: '交付 — PR + STATE 更新 / release tag', usesAgent: false, agents: [] },
  { step: 'continue', name: 'specwf:continue', description: '自动推进 — 读 STATE 确定下一步', usesAgent: false, agents: [] },
];

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates', 'commands');

function loadTemplate(step: string): string {
  return readFileSync(join(TEMPLATES_DIR, `${step}.md`), 'utf-8');
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/** 生成单个 slash command 文件内容 */
export function generateSlashCommand(def: CommandDef, config: ProjectConfig): string {
  const body = def.bodyOverride ?? loadAndRenderTemplate(def);
  return `---
name: ${def.name}
description: ${def.description}
---

${body}
`;
}

function loadAndRenderTemplate(def: CommandDef): string {
  try {
    return renderTemplate(loadTemplate(def.step), {
      step: def.step,
      description: def.description,
      usesAgent: String(def.usesAgent),
      agents: def.agents.join(', '),
    });
  } catch {
    return fallbackBody(def);
  }
}

function fallbackBody(def: CommandDef): string {
  const agentsSection = def.usesAgent && def.agents.length > 0
    ? `调用 task 工具 fan-out \`specwf-${def.agents[0]}\` agent。`
    : '本步骤不使用子代理。';
  return `# 工作流: ${def.description}

## 1. 角色定义

本步骤负责执行标准的 specwf 工作流操作。
- **产出**：按照 specwf 标准流程执行

## 2. 前置条件

- state.md 状态正确
- 前置步骤已全部完成

## 3. 执行步骤

\`\`\`bash
# 获取上下文
specwf context ${def.step} $@

# 执行步骤命令
specwf ${def.step}
\`\`\`

## 4. 子代理使用

${agentsSection}

## 5. 产物管理

\`\`\`bash
specwf state
specwf config
\`\`\`

## 6. 验证

\`\`\`bash
specwf state
\`\`\`

## 7. 下一步

\`\`\`bash
specwf continue
\`\`\`
`;
}

/** 生成所有命令文件 */
export function generateAllCommands(config: ProjectConfig): { path: string; content: string }[] {
  return STEP_DEFS.map((def) => ({
    path: `.omp/commands/specwf-${def.step}.md`,
    content: generateSlashCommand(def, config),
  }));
}
