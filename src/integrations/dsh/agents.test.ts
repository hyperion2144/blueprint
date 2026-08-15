/**
 * dsh/agents.test.ts — DeepSeek Harness sub-agent prompt files tests
 *
 * DSH has no runtime discovery for these files; they are the canonical
 * sub-agent system prompts that `bp dispatch` references by path inside
 * the `subagent` tool's `prompt` argument. Content is identical to the
 * `.agents/agents/` variants.
 */

import { describe, it, expect } from 'vitest';
import { generateDshAgents, DSH_AGENT_DEFS } from './agents.js';
import { generateAgentAgents } from '../agent/agents.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateDshAgents', () => {
  it('generates 7 agent prompt files at .dsh/agents/bp-<role>.md', () => {
    const config = {} as ProjectConfig;
    const files = generateDshAgents(config);
    expect(files).toHaveLength(7);
    for (const file of files) {
      expect(file.path).toMatch(/^\.dsh\/agents\/bp-[a-z-]+\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).not.toContain('modelRoles'); // no OMP-specific
      expect(file.content).not.toContain('thinkingLevel'); // no OMP-specific
    }
  });

  it('emits the seven bp sub-agent roles', () => {
    const roles = DSH_AGENT_DEFS.map((d) => d.role);
    expect(roles).toEqual([
      'planner',
      'executor',
      'reviewer',
      'codebase-scanner',
      'refactorer',
      'fixer',
      'designer',
    ]);
  });

  it('is byte-identical to the .agents/agents/ variants (same system prompts)', () => {
    const config = {} as ProjectConfig;
    const dshFiles = generateDshAgents(config);
    const agentFiles = generateAgentAgents(config);
    expect(dshFiles).toHaveLength(agentFiles.length);
    for (let i = 0; i < dshFiles.length; i++) {
      // Same role, same content — only the path prefix differs.
      expect(dshFiles[i].path).toBe(agentFiles[i].path.replace(/^\.agents\//, '.dsh/'));
      expect(dshFiles[i].content).toBe(agentFiles[i].content);
    }
  });

  it('generates a matching snapshot', () => {
    const files = generateDshAgents({} as ProjectConfig);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const role = file.path.replace(/^\.dsh\/agents\/bp-|\.md$/g, '');
      snapshot[role] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('is deterministic — two invocations produce byte-identical output', () => {
    const config = {} as ProjectConfig;
    const first = generateDshAgents(config);
    const second = generateDshAgents(config);
    expect(first).toEqual(second);
  });
});