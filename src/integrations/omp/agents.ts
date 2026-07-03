/**
 * OMP Agent generator
 * Generates .omp/agents/bp-<role>.md files (7 agent definitions).
 *
 * Agent system prompts are imported from TypeScript modules in src/templates/agents/
 * instead of reading markdown files.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveModels } from '../../core/config.js';
import type { ProjectConfig } from '../../types/index.js';
import { AGENT_PROMPTS } from '../../templates/agents/index.js';

export interface AgentDef {
  role: string;
  description: string;
  tools: string[];
  spawns: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ================================================================
 * Agent definitions (8 total — model/thinkingLevel resolved from profile)
 * ================================================================ */

/** 7 agent definitions */
export const AGENT_DEFS: AgentDef[] = [
  // bp-researcher
  {
    role: 'researcher',
    description: 'Technical research — produce STACK/ARCH/PITFALLS/RESEARCH docs',
    tools: ['read', 'grep', 'glob', 'lsp', 'web_search', 'write', 'bash'],
    spawns: '*',
  },
  // bp-planner
  {
    role: 'planner',
    description: 'Change design — produce proposal/design/tasks/delta-specs',
    tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'],
    spawns: '*',
  },
  // bp-executor
  {
    role: 'executor',
    description: 'Code implementation — TDD RED→GREEN→REFACTOR',
    tools: ['read', 'edit', 'write', 'bash', 'grep', 'glob', 'lsp', 'ast_grep', 'ast_edit'],
    spawns: '*',
  },
  // bp-reviewer
  {
    role: 'reviewer',
    description: 'Triple review — spec review + quality review + goal review',
    tools: ['read', 'grep', 'glob', 'lsp', 'ast_grep', 'bash'],
    spawns: '*',
  },
  // bp-phase-researcher
  {
    role: 'phase-researcher',
    description: 'Phase research — produce RESEARCH.md for planner',
    tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'],
    spawns: '*',
  },
  // bp-codebase-mapper — brownfield codebase analysis
  {
    role: 'codebase-mapper',
    description: 'Codebase mapping — analyze existing code, produce technical reports',
    tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'],
    spawns: '*',
  },
  // bp-spec-bootstrapper — extract behavioral contracts from code
  {
    role: 'spec-bootstrapper',
    description: 'Spec bootstrapping — extract behavioral contracts from existing code',
    tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'],
    spawns: '*',
  },
];

/* ================================================================
 * Agent file generation
 * ================================================================ */

/**
 * Resolve agent model from project config.
 * Priority: agentModels[role] (per-agent override) > models[role] (resolved from profile/tier) > pi/default
 */
export function resolveAgentModel(role: string, config: ProjectConfig): string {
  // 1. Per-agent override (highest priority)
  if (config.agentModels && config.agentModels[role]) {
    return config.agentModels[role];
  }
  // 2. Resolved from profile or tier defaults
  const resolved = resolveModels(config);
  if (resolved[role]) {
    return resolved[role];
  }
  // 3. Fallback
  return 'pi/default';
}

/** Resolve agent thinking level */
export function resolveThinkingLevel(role: string): string {
  const xhighThinkingRoles = ['planner', 'researcher', 'reviewer'];
  return xhighThinkingRoles.includes(role) ? 'xhigh' : 'high';
}

/** Generate a single agent file */
export function generateAgent(def: AgentDef, model: string): string {
  const thinkingLevel = resolveThinkingLevel(def.role);
  const body = AGENT_PROMPTS[def.role] ?? `# ${def.description}\n\nAgent system prompt for bp-${def.role}.`;

  return `---
name: bp-${def.role}
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

/** Generate all agent files */
export function generateAllAgents(config: ProjectConfig): { path: string; content: string }[] {
  return AGENT_DEFS.map((def) => ({
    path: `.omp/agents/bp-${def.role}.md`,
    content: generateAgent(def, resolveAgentModel(def.role, config)),
  }));
}
