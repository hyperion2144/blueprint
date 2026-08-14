/**
 * claude-code/agents.ts — Claude Code agent file generator
 *
 * Generates .claude/agents/bp-<role>.md files for each blueprint agent.
 * Uses Claude Code standard frontmatter format.
 */

import type { ProjectConfig } from '../../types/index.js';
import { prunePrompt } from '../../core/prompt-pruner.js';
import type { PromptProfile } from '../../core/prompt-pruner.js';
import { AGENT_PROMPTS } from '../../templates/agents/index.js';

export interface ClaudeAgentDef {
  role: string;
  description: string;
  tools: string[];
  model?: string;
  effort?: string;
}

export const AGENT_DEFS: ClaudeAgentDef[] = [
  { role: 'planner', description: 'Change design — produce proposal/design/tasks/delta-specs', tools: [], effort: 'high' },
  { role: 'executor', description: 'Code implementation — TDD RED→GREEN→REFACTOR', tools: [], effort: 'high' },
  { role: 'reviewer', description: 'Triple review — spec review + quality review + goal review', tools: [], effort: 'high' },
  { role: 'codebase-scanner', description: 'Brownfield codebase scan - extract behavioral contracts into specs', tools: [] },
  { role: 'refactorer', description: 'Behavior-preserving consolidation + spec sync per assigned module', tools: [], effort: 'high' },
  { role: 'fixer', description: 'Fix proposal/design/implementation per reviewer report', tools: [], effort: 'high' },
  { role: 'designer', description: 'Design consultation, HTML generation, visual audit, and variant exploration', tools: [], effort: 'high' },
];
export function generateClaudeAgent(def: ClaudeAgentDef, profile?: PromptProfile): string {
  const prompt = AGENT_PROMPTS[def.role as keyof typeof AGENT_PROMPTS];
  let body = prompt || `# ${def.role}\n\nAgent definition for ${def.description}.`;
  if (profile) body = prunePrompt(body, profile);

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

export function generateClaudeAgents(config: ProjectConfig): { path: string; content: string }[] {
  return AGENT_DEFS.map((def) => {
    const model = config.models?.[def.role];
    return {
      path: `.claude/agents/bp-${def.role}.md`,
      content: generateClaudeAgent(model ? { ...def, model } : def, config.prompt_profile),
    };
  });
}
