/**
 * agent/agents.ts — .agent/ agent file generator
 *
 * Generates .agent/agents/bp-<role>.md files with generic frontmatter.
 */

import type { ProjectConfig } from '../../types/index.js';
import { prunePrompt } from '../../core/prompt-pruner.js';
import type { PromptProfile } from '../../core/prompt-pruner.js';
import { AGENT_PROMPTS } from '../../templates/agents/index.js';

export interface AgentAgentDef {
  role: string;
  description: string;
  tools: string[];
  model?: string;
}

export const AGENT_DEFS: AgentAgentDef[] = [
  { role: 'planner', description: 'Change design', tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'] },
  { role: 'executor', description: 'Code implementation', tools: ['read', 'edit', 'write', 'bash', 'grep', 'glob', 'lsp', 'ast_grep', 'ast_edit'] },
  { role: 'reviewer', description: 'Triple review', tools: ['read', 'write', 'grep', 'glob', 'lsp', 'ast_grep', 'bash'] },
  { role: 'codebase-scanner', description: 'Brownfield codebase scan - extract behavioral contracts into specs', tools: ['read', 'grep', 'glob', 'lsp', 'write', 'bash'] },
];
export function generateAgentAgent(def: AgentAgentDef, profile?: PromptProfile): string {
  const prompt = AGENT_PROMPTS[def.role as keyof typeof AGENT_PROMPTS];
  let body = prompt || `# ${def.role}\n\nAgent definition.`;
  if (profile) body = prunePrompt(body, profile);
  const frontmatter: string[] = ['---', `name: bp-${def.role}`, `description: ${def.description}`];
  if (def.tools.length > 0) {
    frontmatter.push('tools:');
    for (const t of def.tools) frontmatter.push(`  - ${t}`);
  }
  if (def.model) frontmatter.push(`model: ${def.model}`);
  frontmatter.push('---', '', body);
  return frontmatter.join('\n');
}

export function generateAgentAgents(config: ProjectConfig): { path: string; content: string }[] {
  return AGENT_DEFS.map((def) => {
    const model = config.models?.[def.role];
    return {
      path: `.agent/agents/bp-${def.role}.md`,
      content: generateAgentAgent(model ? { ...def, model } : def, config.prompt_profile),
    };
  });
}
