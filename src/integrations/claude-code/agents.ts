/**
 * claude-code/agents.ts — Claude Code agent file generator
 *
 * Generates .claude/agents/bp-<role>.md files for each blueprint agent.
 * Uses Claude Code standard frontmatter format.
 */

import type { ProjectConfig } from '../../types/index.js';
import { AGENT_PROMPTS } from '../../templates/agents/index.js';

export interface ClaudeAgentDef {
  role: string;
  description: string;
  tools: string[];
  model?: string;
  effort?: string;
}

export const AGENT_DEFS: ClaudeAgentDef[] = [
  { role: 'researcher', description: 'Technical research — produce STACK/ARCH/PITFALLS/RESEARCH docs', tools: ['read', 'grep', 'glob', 'lsp', 'web_search', 'write', 'bash'], model: 'opus', effort: 'high' },
  { role: 'planner', description: 'Change design — produce proposal/design/tasks/delta-specs', tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'], model: 'opus', effort: 'high' },
  { role: 'executor', description: 'Code implementation — TDD RED→GREEN→REFACTOR', tools: ['read', 'edit', 'write', 'bash', 'grep', 'glob', 'lsp', 'ast_grep', 'ast_edit'], model: 'sonnet', effort: 'high' },
  { role: 'reviewer', description: 'Triple review — spec review + quality review + goal review', tools: ['read', 'grep', 'glob', 'lsp', 'ast_grep', 'bash'], model: 'opus', effort: 'high' },
  { role: 'phase-researcher', description: 'Phase research — produce RESEARCH.md for planner', tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'], model: 'sonnet', effort: 'medium' },
  { role: 'codebase-mapper', description: 'Codebase mapping — analyze existing code, produce technical reports', tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'], model: 'sonnet', effort: 'medium' },
  { role: 'spec-bootstrapper', description: 'Spec bootstrapping — extract behavioral contracts from existing code', tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'], model: 'sonnet', effort: 'medium' },
];

export function generateClaudeAgent(def: ClaudeAgentDef): string {
  const prompt = AGENT_PROMPTS[def.role as keyof typeof AGENT_PROMPTS];
  const body = prompt || `# ${def.role}\n\nAgent definition for ${def.description}.`;

  const lines = ['---', `name: bp-${def.role}`, `description: ${def.description}`];
  if (def.tools.length > 0) {
    lines.push('tools:');
    for (const tool of def.tools) {
      lines.push(`  - ${tool}`);
    }
  }
  if (def.model) lines.push(`model: ${def.model}`);
  if (def.effort) lines.push(`effort: ${def.effort}`);
  lines.push('---', '', body);

  return lines.join('\n');
}

export function generateClaudeAgents(_config: ProjectConfig): { path: string; content: string }[] {
  return AGENT_DEFS.map((def) => ({
    path: `.claude/agents/bp-${def.role}.md`,
    content: generateClaudeAgent(def),
  }));
}
