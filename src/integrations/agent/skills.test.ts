import { describe, it, expect } from 'vitest';
import { generateAgentSkills, AGENT_SKILL_DEFS } from './skills.js';
import { generateCodexSkills, CODEX_SKILL_DEFS } from '../codex/skills.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateAgentSkills', () => {
  it('generates all skill files at .agents/skills/bp-<step>/SKILL.md', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    expect(files.length).toBe(16);
    for (const file of files) {
      expect(file.path).toMatch(/^\.agents\/skills\/bp-[a-z-]+\/SKILL\.md$/);
      expect(file.content).toContain('---');
      // Codex-style frontmatter: colon slash-command name, no `hide`, no `argument-hint`
      expect(file.content).toMatch(/^---\nname: bp:[a-z-]+\n/);
    }
  });

  it('preserves $ARGUMENTS for runtime replacement (consistent with OMP and Claude Code)', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const planFile = files.find((f) => f.path.includes('bp-plan'));
    expect(planFile).toBeDefined();
    expect(planFile!.content).toContain('$ARGUMENTS');
    expect(planFile!.content).not.toContain('[BP:CHANGE_NAME]');
  });

  it('generates propose skill file with frontmatter', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const msFile = files.find((f) => f.path.includes('bp-propose'));
    expect(msFile).toBeDefined();
    expect(msFile!.content).toContain('name: bp:propose');
  });

  it('generates apply skill file with frontmatter', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const grillFile = files.find((f) => f.path.includes('bp-apply'));
    expect(grillFile).toBeDefined();
    expect(grillFile!.content).toContain('name: bp:apply');
  });

  it('generates matching snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const step = file.path.replace(/^\.agents\/skills\/bp-|\/SKILL\.md$/g, '');
      snapshot[step] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });

  it('generates bp-refactor skill with Codex-style colon name', () => {
    const config = {} as ProjectConfig;
    const files = generateAgentSkills(config);
    const refactorFile = files.find((f) => f.path === '.agents/skills/bp-refactor/SKILL.md');
    expect(refactorFile).toBeDefined();
    expect(refactorFile!.content).toMatch(/^---\nname: bp:refactor\n/);
    expect(refactorFile!.content).toContain('Run deterministic refactor analyzer');
    expect(refactorFile!.content).not.toContain('hide: false');
    expect(refactorFile!.content).not.toContain('argument-hint');
  });
});

describe('agent + codex skills unification', () => {
  it('AGENT_SKILL_DEFS and CODEX_SKILL_DEFS are identity-equal', () => {
    expect(AGENT_SKILL_DEFS).toBe(CODEX_SKILL_DEFS);
  });

  it('generateAgentSkills and generateCodexSkills emit byte-identical paths and content', () => {
    const config = {} as ProjectConfig;
    const agentFiles = generateAgentSkills(config);
    const codexFiles = generateCodexSkills(config);
    expect(agentFiles.length).toBe(codexFiles.length);
    expect(agentFiles.length).toBe(16);
    for (let i = 0; i < agentFiles.length; i++) {
      expect(agentFiles[i].path).toBe(codexFiles[i].path);
      expect(agentFiles[i].content).toBe(codexFiles[i].content);
    }
  });
});