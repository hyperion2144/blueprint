/**
 * opencode/agents.ts - OpenCode agent file generator
 *
 * Generates .opencode/agents/bp-<role>.md files for each blueprint agent.
 * Uses OpenCode frontmatter format: description (required), mode, tools (object map).
 *
 * Tool permissions use OpenCode's object map format:
 *   tools:
 *     write: false
 *     edit: false
 *     bash: false
 */

import type { ProjectConfig } from '../../types/index.js';
import { prunePrompt } from '../../core/prompt-pruner.js';
import type { PromptProfile } from '../../core/prompt-pruner.js';
import { AGENT_PROMPTS } from '../../templates/agents/index.js';

export interface OpenCodeAgentDef {
  role: string;
  description: string;
  mode: 'primary' | 'subagent' | 'all';
  tools: Record<string, boolean>;
  model?: string;
}

export const AGENT_DEFS: OpenCodeAgentDef[] = [
  {
    role: 'planner',
    description: 'Change design - produce proposal/design/tasks/delta-specs',
    mode: 'subagent',
    tools: { write: false, edit: false, bash: false },
  },
  {
    role: 'executor',
    description: 'Code implementation - TDD RED->GREEN->REFACTOR',
    mode: 'subagent',
    tools: { write: true, edit: true, bash: true },
  },
  {
    role: 'reviewer',
    description: 'Triple review - spec review + quality review + goal review',
    mode: 'subagent',
    tools: { write: false, edit: false, bash: false },
  },
  {
    role: 'codebase-scanner',
    description: 'Brownfield codebase scan - extract behavioral contracts into specs',
    mode: 'subagent',
    tools: { write: false, edit: false, bash: false },
  },
  {
    role: 'refactorer',
    description: 'Behavior-preserving consolidation + spec sync per assigned module',
    mode: 'subagent',
    tools: { write: true, edit: true, bash: true },
  },
];

export function generateOpenCodeAgent(def: OpenCodeAgentDef, profile?: PromptProfile): string {
  const prompt = AGENT_PROMPTS[def.role as keyof typeof AGENT_PROMPTS];
  let body = prompt || `# ${def.role}\n\nAgent definition for ${def.description}.`;
  if (profile) body = prunePrompt(body, profile);

  const lines = [
    '---',
    `description: ${def.description}`,
    `mode: ${def.mode}`,
  ];

  const toolKeys = Object.keys(def.tools);
  if (toolKeys.length > 0) {
    lines.push('tools:');
    for (const key of toolKeys) {
      lines.push(`  ${key}: ${def.tools[key]}`);
    }
  }

  if (def.model) lines.push(`model: ${def.model}`);
  lines.push('---', '', body);

  return lines.join('\n');
}

export function generateOpenCodeAgents(config: ProjectConfig): { path: string; content: string }[] {
  return AGENT_DEFS.map((def) => {
    const model = config.models?.[def.role];
    return {
      path: `.opencode/agents/bp-${def.role}.md`,
      content: generateOpenCodeAgent(model ? { ...def, model } : def, config.prompt_profile),
    };
  });
}
