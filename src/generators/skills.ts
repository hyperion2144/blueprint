/**
 * Skills 生成器
 * 生成 skills/specwf-<step>/SKILL.md 文件（14 个 skill 工作流指引）
 *
 * 每个 skill 是 agent 通过 `read skill://specwf-<step>` 按需加载的完整工作流指引。
 * 模板文件存储在 src/templates/skills/<step>.md，支持 {{step}}/{{description}} 占位符。
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { ProjectConfig } from '../types/index.js';

export interface SkillDef {
  /** 步骤标识，与命令步骤一致 */
  step: string;
  /** skill 名称 */
  name: string;
  /** 一句话描述 */
  description: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates', 'skills');

function loadTemplate(step: string): string {
  return readFileSync(join(TEMPLATES_DIR, `${step}.md`), 'utf-8');
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/** 生成 skill 名称 */
function skillName(step: string): string {
  return `specwf-${step}`;
}

/** 生成 skill 描述 */
function skillDescription(step: string): string {
  const map: Record<string, string> = {
    init: '初始化 specwf 项目结构，生成平台文件',
    grill: '需求探讨 — 无限制细节提问直到达成共识',
    research: '项目技术调研 — 并行多方向调研',
    roadmap: '路线图 — 拆分 Milestone × Phase',
    milestone: '里程碑管理 — 切换/创建 Milestone，设置当前阶段',
    discuss: 'Phase 讨论 — 捕获实现决策，形成 context.md',
    'research-phase': 'Phase 调研 — 实现路径研究',
    split: 'Change 拆分 — 依赖图 + N 个 Change',
    adhoc: '创建临时 Change — 与阶段无关的独立变更',
    plan: 'Change 设计 — 技术方案 + 任务拆分 + delta-specs',
    apply: '代码实现 — TDD RED→GREEN→REFACTOR',
    review: '三重审查 — 规格审查/质量审查/目标审查并行',
    verify: '测试验证 — 诊断根因 + 路由回环',
    archive: '归档 — delta-spec 合并 + 代码认知回灌',
    ship: '交付 — PR + STATE 更新 / release tag',
    continue: '自动推进 — 读 STATE 确定下一步并触发对应命令',
  };
  return map[step] ?? '';
}


const STEPS = ['init', 'grill', 'research', 'roadmap', 'milestone', 'discuss', 'research-phase', 'split', 'adhoc', 'plan', 'apply', 'review', 'verify', 'archive', 'ship', 'continue'] as const;
export const SKILL_DEFS: SkillDef[] = STEPS.map((step) => ({
  step,
  name: skillName(step),
  description: skillDescription(step),
}));

/**
 * 生成单个 skill 文件的完整内容
 * 格式：frontmatter + body
 */
export function generateSkill(def: SkillDef): string {
  const body = renderTemplate(loadTemplate(def.step), { step: def.step, description: def.description });
  return `---
name: ${def.name}
description: ${def.description}
hide: false
---

${body}
`;
}

/**
 * 生成所有 skill 文件
 * 返回 { path, content }[]，path 格式为 skills/specwf-<step>/SKILL.md
 */
export function generateAllSkills(config: ProjectConfig): { path: string; content: string }[] {
  return SKILL_DEFS.map((def) => ({
    path: `.omp/skills/specwf-${def.step}/SKILL.md`,
    content: generateSkill(def),
  }));
}
