/**
 * pi/agents.test.ts — Pi Coding Agent sub-agent definition generator tests
 *
 * T-2 RED: GIVEN a valid ProjectConfig and AGENT_PROMPTS
 *          WHEN generatePiAgents(config) runs
 *          THEN six agent files are returned at .pi/agents/bp-<role>.md
 *               with generic frontmatter (no OMP-specific fields) and the
 *               role prompt as the file body.
 */

import { describe, it, expect } from 'vitest';
import { generatePiAgents, PI_AGENT_DEFS } from './agents.js';
import { parseFrontmatter } from '../../parser/frontmatter.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generatePiAgents', () => {
  it('generates 6 agent files with generic frontmatter', () => {
    const config = {} as ProjectConfig;
    const files = generatePiAgents(config);
    expect(files).toHaveLength(6);
    for (const file of files) {
      expect(file.path).toMatch(/^\.pi\/agents\/bp-[a-z-]+\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).not.toContain('modelRoles'); // no OMP-specific
      expect(file.content).not.toContain('thinkingLevel'); // no OMP-specific
    }
  });

  it('emits the canonical six roles in order', () => {
    expect(PI_AGENT_DEFS).toHaveLength(6);
    const roles = PI_AGENT_DEFS.map((d) => d.role);
    expect(roles).toEqual([
      'planner',
      'executor',
      'reviewer',
      'codebase-scanner',
      'refactorer',
      'fixer',
    ]);
  });

  it('parses via parseFrontmatter with name bp-<role> and non-empty body', () => {
    const files = generatePiAgents({} as ProjectConfig);
    for (const file of files) {
      const { data, content } = parseFrontmatter(file.content);
      const role = file.path.replace(/^\.pi\/agents\/bp-|\.md$/g, '');
      expect(data.name).toBe(`bp-${role}`);
      const description = data.description as string;
      expect(typeof description).toBe('string');
      expect(description.length).toBeGreaterThan(0);
      expect(content.trim().length).toBeGreaterThan(0);
    }
  });

  it('generates matching snapshot', () => {
    const files = generatePiAgents({} as ProjectConfig);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const role = file.path.replace(/^\.pi\/agents\/bp-|\.md$/g, '');
      snapshot[role] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('generates bp-refactorer agent with consolidation description', () => {
    const files = generatePiAgents({} as ProjectConfig);
    const refactorer = files.find((f) => f.path === '.pi/agents/bp-refactorer.md');
    expect(refactorer).toBeDefined();
    expect(refactorer!.content).toContain('name: bp-refactorer');
    expect(refactorer!.content).toContain('Behavior-preserving consolidation + spec sync per assigned module');
    expect(refactorer!.content).toContain('behavior preservation is mandatory');
  });

  it('emits model in frontmatter when config.models assigns one', () => {
    const config = { models: { refactorer: 'model-refactorer-x' } } as unknown as ProjectConfig;
    const files = generatePiAgents(config);
    const refactorer = files.find((f) => f.path === '.pi/agents/bp-refactorer.md');
    expect(refactorer).toBeDefined();
    const { data } = parseFrontmatter(refactorer!.content);
    expect(data.model).toBe('model-refactorer-x');
  });

  it('is deterministic — two invocations produce byte-identical output', () => {
    const first = generatePiAgents({} as ProjectConfig);
    const second = generatePiAgents({} as ProjectConfig);
    expect(first).toEqual(second);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].content).toBe(second[i].content);
    }
  });
});
