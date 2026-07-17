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
  { role: 'planner', description: 'Change design — produce proposal/design/tasks/delta-specs', tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'], model: 'opus', effort: 'high' },
  { role: 'executor', description: 'Code implementation — TDD RED→GREEN→REFACTOR', tools: ['read', 'edit', 'write', 'bash', 'grep', 'glob', 'lsp', 'ast_grep', 'ast_edit'], model: 'sonnet', effort: 'high' },
  { role: 'reviewer', description: 'Triple review — spec review + quality review + goal review', tools: ['read', 'write', 'grep', 'glob', 'lsp', 'ast_grep', 'bash'], model: 'opus', effort: 'high' },
  { role: 'codebase-scanner', description: 'Brownfield codebase scan - extract behavioral contracts into specs', tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'] },
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
