/**
 * Core template types for skills and slash commands.
 *
 * Follows OpenSpec's template model:
 * - SkillTemplate: instructions wrapped in a skill metadata envelope
 * - CommandTemplate: same instructions wrapped in a command metadata envelope
 *
 * Both share the same `instructions` / `content` string — the difference is
 * the formatting wrapper applied by the generator.
 */

export interface SkillTemplate {
  /** Skill identifier (e.g., 'bp-plan') */
  name: string;
  /** One-line description for discovery */
  description: string;
  /** Full workflow instructions body */
  instructions: string;
}

export interface CommandTemplate {
  /** Command display name (e.g., 'BP: Plan') */
  name: string;
  /** One-line description */
  description: string;
  /** Grouping category (e.g., 'Workflow') */
  category: string;
  /** Search/index tags */
  tags: string[];
  /** Full workflow content (same as SkillTemplate.instructions) */
  content: string;
}

/**
 * An artifact template for output documents (proposal, design, tasks, etc.).
 */
export interface ArtifactTemplate {
  /** Template identifier matching CLI `bp template <id>` */
  id: string;
  /** Human-readable label */
  label: string;
  /** Full template body with {{placeholder}} variables */
  body: string;
}

/**
 * An agent system prompt template.
 */
export interface AgentPromptTemplate {
  /** Agent role identifier (e.g., 'planner', 'executor') */
  role: string;
  /** Agent display name */
  name: string;
  /** One-line description */
  description: string;
  /** Full system prompt body */
  body: string;
}

/** Shared orchestrator rule injected into all sub-agent dispatcher commands.
 *  Saves ~50 chars per template vs duplicating "You are the orchestrator". */
export const ORCHESTRATOR_RULE = `**You are the orchestrator — dispatch sub-agents; do not do their work yourself.**\n\n`;
