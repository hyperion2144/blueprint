/**
 * Integration barrel — each platform gets its own directory.
 *
 * Currently supported:
 * - omp: OMP coding agent (commands, skills, agents, hooks)
 * - claude-code: Claude Code (commands, agents)
 * - agent: Generic .agent (skills, agents)
 * - codex: OpenAI Codex CLI (skills, hooks) — added in add-codex-support
 */

export * as omp from './omp/index.js';
export * as codex from './codex/index.js';