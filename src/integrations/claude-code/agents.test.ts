import { describe, it, expect } from 'vitest';
import { generateClaudeAgents } from './agents.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateClaudeAgents', () => {
  it('generates all agent files with correct frontmatter', () => {
    const config = {} as ProjectConfig;
    const files = generateClaudeAgents(config);
    expect(files).toHaveLength(3);
    for (const file of files) {
      expect(file.path).toMatch(/^\.claude\/agents\/bp-[a-z-]+\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).toMatch(/^---\nname: bp-/);
    }
  });

  it('generates matching snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateClaudeAgents(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const role = file.path.replace(/^\.claude\/agents\/bp-|\.md$/g, '');
      snapshot[role] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });
});
