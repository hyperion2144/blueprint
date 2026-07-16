import { describe, it, expect } from 'vitest';
import { generateAgentSkills } from './skills.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateAgentSkills', () => {
  it('generates all skill files with correct paths', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    expect(files.length).toBe(8);
    for (const file of files) {
      expect(file.path).toMatch(/^\.agent\/skills\/bp-[a-z-]+\/SKILL\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).toContain('name: bp-');
    }
  });

  it('replaces $1 with [BP:CHANGE_NAME] for change-scoped steps (e.g. plan)', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const planFile = files.find((f) => f.path.includes('bp-plan'));
    expect(planFile).toBeDefined();
    expect(planFile!.content).toContain('[BP:CHANGE_NAME]');
    expect(planFile!.content).not.toContain('$1');
    expect(planFile!.content).not.toContain('$ARGUMENTS');
  });

  it('generates propose skill file with frontmatter', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const msFile = files.find((f) => f.path.includes('bp-propose'));
    expect(msFile).toBeDefined();
    expect(msFile!.content).toContain('name: bp-propose');
  });

  it('generates apply skill file with frontmatter', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const grillFile = files.find((f) => f.path.includes('bp-apply'));
    expect(grillFile).toBeDefined();
    expect(grillFile!.content).toContain('name: bp-apply');
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
