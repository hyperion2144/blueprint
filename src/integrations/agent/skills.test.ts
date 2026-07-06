import { describe, it, expect } from 'vitest';
import { generateAgentSkills } from './skills.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateAgentSkills', () => {
  it('generates all skill files with [BP:xxx] parameters', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    expect(files.length).toBeGreaterThanOrEqual(20);
    for (const file of files) {
      expect(file.path).toMatch(/^\.agent\/skills\/bp-[a-z-]+\/SKILL\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).toContain('name: bp-');
      // No $1 or $ARGUMENTS should remain
      expect(file.content).not.toContain('$ARGUMENTS');
    }
  });

  it('generates matching snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const step = file.path.replace(/^\.agent\/skills\/bp-|\/SKILL\.md$/g, '');
      snapshot[step] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });
});
