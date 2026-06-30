/**
 * Integration barrel — each platform gets its own directory.
 *
 * Currently supported:
 * - omp: OMP coding agent (commands, skills, agents, hooks)
 *
 * Planned:
 * - claude-code: Claude Code (commands, hooks)
 */

export * as omp from './omp/index.js';
