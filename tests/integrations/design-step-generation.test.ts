/**
 * design-step-generation.test.ts — platform generator design-track tests
 *
 * T-5 RED: GIVEN the platform generator modules
 *          WHEN PI_SKILL_DEFS, CODEX_SKILL_DEFS, agent skills STEPS,
 *               claude-code commands STEPS, omp commands STEPS, and omp
 *               skills STEPS are read
 *          THEN each includes the five design steps (lengths 16/16/16/16/16/15),
 *               the agent role lists include designer (length 7), generated
 *               design-step bodies are byte-identical to the registry
 *               instructions, and no new description contains ': '.
 *
 * Spec: specs/design/spec.md#Platform-Design-Step-Generation
 */

import { describe, expect, it } from 'vitest';
import { PI_SKILL_DEFS, generatePiSkills } from '../../src/integrations/pi/skills.js';
import { PI_AGENT_DEFS, generatePiAgents } from '../../src/integrations/pi/agents.js';
import { CODEX_SKILL_DEFS, generateCodexSkills } from '../../src/integrations/codex/skills.js';
import { generateAgentSkills } from '../../src/integrations/agent/skills.js';
import { AGENT_DEFS as AGENT_AGENT_DEFS, generateAgentAgents } from '../../src/integrations/agent/agents.js';
import { DSH_SKILL_DEFS, generateDshSkills } from '../../src/integrations/dsh/skills.js';
import { generateClaudeCommands } from '../../src/integrations/claude-code/commands.js';
import { AGENT_DEFS as CLAUDE_AGENT_DEFS, generateClaudeAgents } from '../../src/integrations/claude-code/agents.js';
import { SKILL_DEFS as OMP_SKILL_DEFS, generateAllSkills } from '../../src/integrations/omp/skills.js';
import { STEP_DEFS as OMP_COMMAND_DEFS, generateAllCommands } from '../../src/integrations/omp/commands.js';
import { AGENT_DEFS as OMP_AGENT_DEFS, generateAllAgents } from '../../src/integrations/omp/agents.js';
import { WORKFLOW_REGISTRY } from '../../src/templates/workflows/registry.js';
import type { ProjectConfig } from '../../src/types/index.js';

const DESIGN_STEPS = ['design', 'design-html', 'design-review', 'design-shotgun', 'plan-design-review'] as const;
const DESIGNER_DESCRIPTION = 'Design consultation, HTML generation, visual audit, and variant exploration';

describe('design-step platform generation (T-5)', () => {
  it('grows every configured platform step list with the five design steps', () => {
    const piSteps = PI_SKILL_DEFS.map((d) => d.step);
    const codexSteps = CODEX_SKILL_DEFS.map((d) => d.step);
    const dshSteps = DSH_SKILL_DEFS.map((d) => d.step);
    const ompSkillSteps = OMP_SKILL_DEFS.map((d) => d.step);
    const ompCommandSteps = OMP_COMMAND_DEFS.map((d) => d.step);

    expect(PI_SKILL_DEFS).toHaveLength(16);
    expect(CODEX_SKILL_DEFS).toHaveLength(16);
    expect(DSH_SKILL_DEFS).toHaveLength(16);
    expect(ompSkillSteps).toHaveLength(15); // omp skills lack refactor (pre-existing gap, D-9)
    expect(ompCommandSteps).toHaveLength(16);

    for (const step of DESIGN_STEPS) {
      expect(piSteps).toContain(step);
      expect(codexSteps).toContain(step);
      expect(dshSteps).toContain(step);
      expect(ompSkillSteps).toContain(step);
      expect(ompCommandSteps).toContain(step);
    }
  });

  it('generates 16 claude-code, agent, and dsh skill/command files including the design steps', () => {
    const claudeFiles = generateClaudeCommands({} as ProjectConfig);
    const agentFiles = generateAgentSkills({} as ProjectConfig);
    const dshFiles = generateDshSkills({} as ProjectConfig);
    expect(claudeFiles).toHaveLength(16);
    expect(agentFiles).toHaveLength(16);
    expect(dshFiles).toHaveLength(16);
    for (const step of DESIGN_STEPS) {
      expect(claudeFiles.some((f) => f.path === `.claude/commands/bp-${step}.md`)).toBe(true);
      expect(agentFiles.some((f) => f.path === `.agents/skills/bp-${step}/SKILL.md`)).toBe(true);
      expect(dshFiles.some((f) => f.path === `.dsh/skills/bp-${step}/SKILL.md`)).toBe(true);
    }
  });

  it('emits the designer role from every agent generator (length 7)', () => {
    expect(PI_AGENT_DEFS).toHaveLength(7);
    expect(AGENT_AGENT_DEFS).toHaveLength(7);
    expect(CLAUDE_AGENT_DEFS).toHaveLength(7);
    expect(OMP_AGENT_DEFS).toHaveLength(7);
    for (const defs of [PI_AGENT_DEFS, AGENT_AGENT_DEFS, CLAUDE_AGENT_DEFS, OMP_AGENT_DEFS]) {
      const designer = defs.find((d) => d.role === 'designer');
      expect(designer).toBeDefined();
      expect(designer!.description).toBe(DESIGNER_DESCRIPTION);
    }

    const piAgents = generatePiAgents({} as ProjectConfig);
    expect(piAgents.some((f) => f.path === '.pi/agents/bp-designer.md')).toBe(true);
  });

  it('generates each design-step body byte-identical to the registry instructions', () => {
    const piFiles = generatePiSkills({} as ProjectConfig);
    const codexFiles = generateCodexSkills({} as ProjectConfig);
    const agentFiles = generateAgentSkills({} as ProjectConfig);
    const dshFiles = generateDshSkills({} as ProjectConfig);
    const claudeFiles = generateClaudeCommands({} as ProjectConfig);
    const ompSkillFiles = generateAllSkills({} as ProjectConfig);
    const ompCommandFiles = generateAllCommands({} as ProjectConfig);

    for (const step of DESIGN_STEPS) {
      const skillInstr = WORKFLOW_REGISTRY[step].skill().instructions;
      const commandContent = WORKFLOW_REGISTRY[step].command().content;
      expect(skillInstr).toBe(commandContent);

      expect(piFiles.find((f) => f.path === `.pi/skills/bp-${step}/SKILL.md`)!.content.endsWith(skillInstr)).toBe(true);
      expect(codexFiles.find((f) => f.path === `.agents/skills/bp-${step}/SKILL.md`)!.content.endsWith(skillInstr)).toBe(true);
      expect(agentFiles.find((f) => f.path === `.agents/skills/bp-${step}/SKILL.md`)!.content.endsWith(skillInstr)).toBe(true);
      expect(dshFiles.find((f) => f.path === `.dsh/skills/bp-${step}/SKILL.md`)!.content.endsWith(skillInstr)).toBe(true);
      expect(claudeFiles.find((f) => f.path === `.claude/commands/bp-${step}.md`)!.content.endsWith(commandContent)).toBe(true);
      // omp skills wrap the body in a template literal: frontmatter + '\n\n' + body + file-terminator '\n'
      expect(ompSkillFiles.find((f) => f.path === `.omp/skills/bp-${step}/SKILL.md`)!.content.endsWith(skillInstr + '\n')).toBe(true);
      expect(ompCommandFiles.find((f) => f.path === `.omp/commands/bp-${step}.md`)!.content.endsWith(commandContent)).toBe(true);
    }
  });

  it('keeps every new generated description free of colon+space', () => {
    const newDescriptions: string[] = [];
    for (const def of [...PI_SKILL_DEFS, ...CODEX_SKILL_DEFS, ...DSH_SKILL_DEFS, ...OMP_SKILL_DEFS, ...OMP_COMMAND_DEFS]) {
      if (DESIGN_STEPS.includes(def.step as (typeof DESIGN_STEPS)[number])) newDescriptions.push(def.description);
    }
    expect(newDescriptions).toHaveLength(25); // 5 pi + 5 codex + 5 dsh + 5 omp skills + 5 omp commands
    for (const desc of newDescriptions) {
      expect(desc.match(/:\s/)).toBeNull();
    }
  });
});
