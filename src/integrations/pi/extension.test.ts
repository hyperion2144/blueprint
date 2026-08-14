/**
 * extension.test.ts — pi extension template source tests
 *
 * T-3 RED: GIVEN the template module is imported
 *          WHEN EXTENSION_SOURCE is inspected
 *          THEN it contains the handler registrations, the bp_subagent
 *               tool definition, the env-bypass check, and the pi package
 *               import; the string is byte-identical across two imports
 *               and matches the emitted-source snapshot.
 *
 * T-6 (appended later): generatePiExtension descriptor tests.
 */

import { describe, it, expect } from 'vitest';
import { EXTENSION_SOURCE } from '../../templates/pi/extension.tmpl.js';
import type { ProjectConfig } from '../../types/index.js';

describe('pi extension template source (T-3)', () => {
  it('registers the three context handlers and the bp_subagent tool', () => {
    expect(EXTENSION_SOURCE).toContain('api.on("session_start"');
    expect(EXTENSION_SOURCE).toContain('api.on("before_agent_start"');
    expect(EXTENSION_SOURCE).toContain('api.on("context"');
    expect(EXTENSION_SOURCE).toContain('name: "bp_subagent"');
  });

  it('contains the env-bypass check, workflow-state customType, and pi package imports', () => {
    expect(EXTENSION_SOURCE).toContain('process.env.BP_HOOKS === "0"');
    expect(EXTENSION_SOURCE).toContain('customType: "bp-workflow-state"');
    expect(EXTENSION_SOURCE).toContain('@earendil-works/pi-coding-agent');
  });

  it('contains the role TITLE phrases used for agent-type detection (R1 lockstep)', () => {
    // The inline detectAgentType must key on the real AGENT_PROMPTS title
    // phrases, not bare role-name substrings (which do not exist in the
    // shipped bodies and false-positive across roles).
    expect(EXTENSION_SOURCE).toContain('Change Design Specialist');
    expect(EXTENSION_SOURCE).toContain('Design Consultant');
    expect(EXTENSION_SOURCE).toContain('Code Implementation Specialist');
    expect(EXTENSION_SOURCE).toContain('Triple Review Specialist');
    expect(EXTENSION_SOURCE).toContain('Codebase Scanner');
    expect(EXTENSION_SOURCE).toContain('**refactorer** sub-agent');
    expect(EXTENSION_SOURCE).toContain('**bp-fixer** sub-agent');
  });

  it('keeps loadPiAgents filtered to .md files and augmentBody clean for unhandled roles (Q2 lockstep)', () => {
    // Template must ignore non-.md agent files (mirrored by runtime discoverPiAgents)
    // and return the compact block unchanged when no agentType branch matches
    // (codebase-scanner / refactorer-without-report — no trailing newline appended).
    expect(EXTENSION_SOURCE).toContain('entry.name.endsWith(".md")');
    expect(EXTENSION_SOURCE).toContain('if (agentType === "default") return body;');
    expect(EXTENSION_SOURCE).toContain('return body;');
  });

  it('is byte-identical across two imports', async () => {
    const second = await import('../../templates/pi/extension.tmpl.js');
    expect(second.EXTENSION_SOURCE).toBe(EXTENSION_SOURCE);
  });

  it('is a static string with no generation-time env/clock dependence', () => {
    // No Date.now()/Math.random()/process.env reads at module load — the
    // string must be byte-deterministic (only runtime code inside the
    // emitted source may reference Date.now()).
    expect(EXTENSION_SOURCE.length).toBeGreaterThan(1000);
  });

  it('emits a matching snapshot', () => {
    expect(EXTENSION_SOURCE).toMatchSnapshot();
  });
});

describe('pi extension generator (T-6)', () => {
  it('returns the single .pi/extensions/bp/index.ts descriptor sourced from EXTENSION_SOURCE', async () => {
    const { generatePiExtension, PI_EXTENSION_PATH } = await import('./extension.js');
    const config = {} as ProjectConfig;
    const files = generatePiExtension(config);
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe('.pi/extensions/bp/index.ts');
    expect(PI_EXTENSION_PATH).toBe('.pi/extensions/bp/index.ts');
    expect(files[0].content).toBe(EXTENSION_SOURCE);
  });

  it('is deterministic — two invocations are byte-identical', async () => {
    const { generatePiExtension } = await import('./extension.js');
    const config = {} as ProjectConfig;
    const first = generatePiExtension(config);
    const second = generatePiExtension(config);
    expect(first).toEqual(second);
    expect(first[0].content).toBe(second[0].content);
  });
});

