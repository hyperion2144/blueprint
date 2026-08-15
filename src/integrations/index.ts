/**
 * Integration barrel — each platform gets its own directory.
 *
 * Currently supported:
 * - omp: OMP coding agent (commands, skills, agents, hooks)
 * - claude-code: Claude Code (commands, agents)
 * - agent: Generic `.agents/` platform (skills + sub-agents)
 * - codex: OpenAI Codex CLI (hooks + handler; skills shared with `agent`)
 * - pi: Pi Coding Agent (skills, agents, extension) — added in add-pi-platform
 * - dsh: DeepSeek Harness (project-scoped `.dsh/skills`, kebab-case names)
 */

export * as omp from './omp/index.js';
export * as codex from './codex/index.js';
export * as pi from './pi/index.js';
export * as dsh from './dsh/index.js';