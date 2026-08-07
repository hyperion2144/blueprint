import { describe, it, expect } from 'vitest';
import { generateAgentAgents } from './agents.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateAgentAgents', () => {
  it('generates 6 agent files with generic frontmatter', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentAgents(config);
    expect(files).toHaveLength(6);
    for (const file of files) {
      expect(file.path).toMatch(/^\.agent\/agents\/bp-[a-z-]+\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).not.toContain('modelRoles'); // no OMP-specific
      expect(file.content).not.toContain('thinkingLevel'); // no OMP-specific
    }
  });

  it('generates matching snapshot', () => {
    const files = generateAgentAgents({} as ProjectConfig);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const role = file.path.replace(/^\.agent\/agents\/bp-|\.md$/g, '');
      snapshot[role] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('generates bp-refactorer agent with consolidation description', () => {
    const files = generateAgentAgents({} as ProjectConfig);
    const refactorer = files.find((f) => f.path === '.agent/agents/bp-refactorer.md');
    expect(refactorer).toBeDefined();
    expect(refactorer!.content).toContain('name: bp-refactorer');
    expect(refactorer!.content).toContain('Behavior-preserving consolidation + spec sync per assigned module');
    expect(refactorer!.content).toContain('behavior preservation is mandatory');
  });
});
