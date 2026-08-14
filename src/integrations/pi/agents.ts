/**
 * pi/agents.ts — Pi Coding Agent sub-agent definition generator
 *
 * Generates .pi/agents/bp-<role>.md files with generic frontmatter
 * (name/description/tools/model + body = system prompt) in pi's
 * project-agent file format so the bp extension's `bp_subagent` tool
 * can parse them.
 */

import type { ProjectConfig } from '../../types/index.js';
import { prunePrompt } from '../../core/prompt-pruner.js';
import type { PromptProfile } from '../../core/prompt-pruner.js';
import { AGENT_PROMPTS } from '../../templates/agents/index.js';

export interface PiAgentDef {
  role: string;
  description: string;
  tools: string[];
  model?: string;
}

export const PI_AGENT_DEFS: PiAgentDef[] = [
  { role: 'planner', description: 'Change design', tools: [] },
  { role: 'executor', description: 'Code implementation', tools: [] },
  { role: 'reviewer', description: 'Triple review', tools: [] },
  { role: 'codebase-scanner', description: 'Brownfield codebase scan - extract behavioral contracts into specs', tools: [] },
  { role: 'refactorer', description: 'Behavior-preserving consolidation + spec sync per assigned module', tools: [] },
  { role: 'fixer', description: 'Fix proposal/design/implementation per reviewer report', tools: [] },
];

export function generatePiAgent(def: PiAgentDef, profile?: PromptProfile): string {
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

export function generatePiAgents(config: ProjectConfig): { path: string; content: string }[] {
  return PI_AGENT_DEFS.map((def) => {
    const model = config.models?.[def.role];
    return {
      path: `.pi/agents/bp-${def.role}.md`,
      content: generatePiAgent(model ? { ...def, model } : def, config.prompt_profile),
    };
  });
}
