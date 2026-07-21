/**
 * OMP Agent generator
 * Generates .omp/agents/bp-<role>.md files (v2: planner, executor, reviewer).
 *
 * Agent system prompts are imported from TypeScript modules in src/templates/agents/
 * instead of reading markdown files.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveModels } from '../../core/config.js';
import { prunePrompt } from '../../core/prompt-pruner.js';
import type { PromptProfile } from '../../core/prompt-pruner.js';
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
 * Agent definitions (3 total for v2: planner, executor, reviewer)
 * ================================================================ */

export const AGENT_DEFS: AgentDef[] = [
  {
    role: 'planner',
    description: 'Change design — produce proposal/design/tasks/delta-specs',
    tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'],
    spawns: '*',
  },
  {
    role: 'executor',
    description: 'Code implementation — TDD RED/GREEN/REFACTOR',
    tools: ['read', 'edit', 'write', 'bash', 'grep', 'glob', 'lsp', 'ast_grep', 'ast_edit'],
    spawns: '*',
  },
  {
    role: 'reviewer',
    description: 'Triple review — spec review + quality review + goal review',
    tools: ['read', 'write', 'grep', 'glob', 'lsp', 'ast_grep', 'bash'],
    spawns: '*',
  },
  {
    role: 'codebase-scanner',
    description: 'Brownfield codebase scan - extract behavioral contracts into specs',
    tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'],
    spawns: '*',
  },
];
/* ================================================================
 * Agent file generation
 * ================================================================ */

/**
 * Resolve agent model from project config.
 * Priority: models[role] (per-agent override) > resolved profile defaults > pi/default
 */
export function resolveAgentModel(role: string, config: ProjectConfig): string {
  // 1. Per-agent override from models map (highest priority)
  if (config.models && config.models[role]) {
    return config.models[role];
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
  const xhighThinkingRoles = ['planner', 'reviewer'];
  return xhighThinkingRoles.includes(role) ? 'xhigh' : 'high';
}
/** Generate a single agent file */
export function generateAgent(def: AgentDef, model: string, profile?: PromptProfile): string {
  const thinkingLevel = resolveThinkingLevel(def.role);
  let body = AGENT_PROMPTS[def.role] ?? `# ${def.description}\n\nAgent system prompt for bp-${def.role}.`;
  if (profile) body = prunePrompt(body, profile);

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
    content: generateAgent(def, resolveAgentModel(def.role, config), config.prompt_profile),
  }));
}
