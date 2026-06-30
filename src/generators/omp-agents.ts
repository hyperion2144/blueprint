/**
 * OMP Agent 生成器
 * 生成 .omp/agents/specwf-<role>.md 文件（6 个 agent 定义）
 * 每个 agent 的 systemPrompt 包含 6 个完整章节：
 *   角色定义 / 核心约束 / 执行流程 / 偏差规则 / 产物要求 / 验证标准
 *
 * 模板文件存储在 src/templates/agents/<role>.md，支持 {{role}}/{{description}} 占位符。
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveModels } from '../core/config.js';
import type { ProjectConfig } from '../types/index.js';

export interface AgentDef {
  role: string;
  description: string;
  tools: string[];
  toolsComment?: string;
  spawns: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = join(__dirname, 'templates', 'agents');

function loadTemplate(role: string): string {
  return readFileSync(join(TEMPLATES_DIR, `${role}.md`), 'utf-8');
}

function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? '');
}

/* ================================================================
 * Agent 定义（6 个）
 * ================================================================ */

/** 8 个 agent 定义（不含 model/thinkingLevel——这些由 profile 映射） */
export const AGENT_DEFS: AgentDef[] = [
  // ====================================================================
  // specwf-researcher
  // ====================================================================
  {
    role: 'researcher',
    description: '技术调研：产出 STACK/ARCH/PITFALLS/RESEARCH 文档',
    tools: ['read', 'grep', 'glob', 'lsp', 'web_search', 'write', 'bash'],
    spawns: '*',
  },

  // ====================================================================
  // specwf-planner
  // ====================================================================
  {
    role: 'planner',
    description: 'Change 设计：产出 proposal/design/tasks/delta-specs',
    tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'],
    spawns: '*',
  },

  // ====================================================================
  // specwf-executor
  // ====================================================================
  {
    role: 'executor',
    description: '代码实现：TDD RED→GREEN→REFACTOR',
    tools: ['read', 'edit', 'write', 'bash', 'grep', 'glob', 'lsp', 'ast_grep', 'ast_edit'],
    spawns: '*',
  },

  // ====================================================================
  // specwf-reviewer
  // ====================================================================
  {
    role: 'reviewer',
    description: '三重审查：规格审查 + 质量审查 + 目标审查',
    tools: ['read', 'grep', 'glob', 'lsp', 'ast_grep', 'bash'],
    spawns: '*',
  },

  // ====================================================================
  // specwf-verifier
  // ====================================================================
  {
    role: 'verifier',
    description: '测试验证：诊断 + 路由回环',
    tools: ['read', 'bash', 'grep', 'glob', 'lsp', 'edit', 'write'],
    spawns: '*',
  },

  // ====================================================================
  // specwf-archiver
  // ====================================================================
  {
    role: 'archiver',
    description: '归档：delta-spec 合并 + 代码认知回灌',
    tools: ['read', 'grep', 'glob', 'write', 'bash', 'edit'],
    spawns: '*',
  },

  // ====================================================================
  // specwf-codebase-mapper
  // ====================================================================
  {
    role: 'codebase-mapper',
    description: '代码库映射：分析存量代码产出技术现状报告',
    tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'],
    spawns: '*',
  },

  // ====================================================================
  // specwf-spec-bootstrapper
  // ====================================================================
  {
    role: 'spec-bootstrapper',
    description: '规格启动：从代码提取行为契约到 specs/',
    tools: ['read', 'grep', 'glob', 'lsp', 'write'],
    spawns: '*',
  },
];

/* ================================================================
 * Agent 文件生成
 * ================================================================ */

/** 解析 agent 的 model 字段 — 从 profile 默认映射 + 用户覆盖 */
export function resolveAgentModel(role: string, config: ProjectConfig): string {
  const models = resolveModels(config);
  const key = role as keyof typeof models;
  return models[key] ?? 'default';
}

/** 解析 agent 的 thinkingLevel */
export function resolveThinkingLevel(role: string): string {
  const levelMap: Record<string, string> = {
    researcher: 'high',
    planner: 'high',
    executor: 'medium',
    reviewer: 'high',
    verifier: 'medium',
    archiver: 'medium',
    'codebase-mapper': 'low',
    'spec-bootstrapper': 'medium',
  };
  return levelMap[role] ?? 'medium';
}

/** 生成单个 agent 文件 */
export function generateAgent(def: AgentDef, model: string): string {
  const thinkingLevel = resolveThinkingLevel(def.role);
  const body = renderTemplate(loadTemplate(def.role), {
    role: def.role,
    description: def.description,
    tools: def.tools.map((t) => `  - ${t}`).join('\n'),
    model,
    spawns: def.spawns,
  });
  return `---
name: specwf-${def.role}
description: ${def.description}
tools:
${def.tools.map((t) => `  - ${t}`).join('\n')}
model: ${model}
thinkingLevel: ${thinkingLevel}
spawns: "${def.spawns}"
blocking: false
autoloadSkills: false
readSummarize: true
---

${body}
`;
}

/** 生成所有 agent 文件 */
export function generateAllAgents(config: ProjectConfig): { path: string; content: string }[] {
  return AGENT_DEFS.map((def) => ({
    path: `.omp/agents/specwf-${def.role}.md`,
    content: generateAgent(def, resolveAgentModel(def.role, config)),
  }));
}
