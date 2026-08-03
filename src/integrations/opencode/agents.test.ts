import { describe, it, expect } from 'vitest';
import { generateOpenCodeAgents, AGENT_DEFS } from './agents.js';
import type { ProjectConfig } from '../../types/index.js';

describe('generateOpenCodeAgents', () => {
  it('generates all agent files with correct paths', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeAgents(config);
    expect(files.length).toBe(AGENT_DEFS.length);
    for (const file of files) {
      expect(file.path).toMatch(/^\.opencode\/agents\/bp-[a-z-]+\.md$/);
      expect(file.content).toContain('---');
      expect(file.content).toContain('description:');
      expect(file.content).toContain('mode: subagent');
    }
  });

  it('generates planner agent with read-only tools', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeAgents(config);
    const planner = files.find((f) => f.path.includes('bp-planner'));
    expect(planner).toBeDefined();
    expect(planner!.content).toContain('mode: subagent');
    expect(planner!.content).toContain('write: false');
    expect(planner!.content).toContain('edit: false');
    expect(planner!.content).toContain('bash: false');
  });

  it('generates executor agent with full tools', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeAgents(config);
    const executor = files.find((f) => f.path.includes('bp-executor'));
    expect(executor).toBeDefined();
    expect(executor!.content).toContain('write: true');
    expect(executor!.content).toContain('edit: true');
    expect(executor!.content).toContain('bash: true');
  });

  it('generates reviewer agent with read-only tools', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeAgents(config);
    const reviewer = files.find((f) => f.path.includes('bp-reviewer'));
    expect(reviewer).toBeDefined();
    expect(reviewer!.content).toContain('write: false');
    expect(reviewer!.content).toContain('edit: false');
  });

  it('is deterministic - two invocations produce byte-identical output', () => {
    const config = {} as ProjectConfig;
    const first = generateOpenCodeAgents(config);
    const second = generateOpenCodeAgents(config);
    expect(first).toEqual(second);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].content).toBe(second[i].content);
    }
  });

  it('generates matching snapshot', () => {
    const config = {} as ProjectConfig;
    const files = generateOpenCodeAgents(config);
    const snapshot: Record<string, string> = {};
    for (const file of files) {
      const role = file.path.replace(/^\.opencode\/agents\/bp-|\.md$/g, '');
      snapshot[role] = file.content;
    }
    expect(snapshot).toMatchSnapshot();
  });
});
