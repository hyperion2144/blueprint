/**
 * dsh/agents.ts — DeepSeek Harness sub-agent prompt files generator
 *
 * DSH has NO runtime file-discovery for sub-agent definitions (unlike
 * OMP's `.omp/agents/`, Claude Code's `.claude/agents/`, or Pi's
 * `.pi/agents/`): a DSH sub-agent is a fresh child session spawned via
 * the `subagent` tool, and its role instructions must travel inside the
 * `prompt` argument. These files exist so an orchestrator can reference
 * the canonical bp sub-agent system prompts by path:
 *
 *   subagent({ description: 'bp-executor sub-agent',
 *              prompt: 'Read .dsh/agents/bp-executor.md, then execute: <task>' })
 *
 * The files are plain Markdown (same content as the `.agents/agents/`
 * variants — generic frontmatter + the full role system prompt); they
 * are not consumed by any DSH discovery mechanism.
 */

import type { ProjectConfig } from '../../types/index.js';
import {
  AGENT_DEFS,
  generateAgentAgent,
  type AgentAgentDef,
} from '../agent/agents.js';

/** Canonical seven DSH sub-agent definitions (same roles as the generic agent platform). */
export const DSH_AGENT_DEFS: AgentAgentDef[] = AGENT_DEFS;

/**
 * Generate all DSH sub-agent prompt files.
 * Path format: `.dsh/agents/bp-<role>.md`
 */
export function generateDshAgents(config: ProjectConfig): { path: string; content: string }[] {
  return DSH_AGENT_DEFS.map((def) => {
    const model = config.models?.[def.role];
    return {
      path: `.dsh/agents/bp-${def.role}.md`,
      content: generateAgentAgent(model ? { ...def, model } : def, config.prompt_profile),
    };
  });
}