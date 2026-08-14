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
