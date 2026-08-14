/**
 * bp-template.test.ts — `bp template` step mapping (review -> check)
 *
 * T-7: GIVEN the STEP_TO_WORKFLOW map
 *      WHEN `bp template check --stdout` runs
 *      THEN stdout contains the check workflow instructions
 *           AND `bp template review --stdout` still emits the review.md
 *           artifact template (`# Review:` header).
 *
 * Spec: specs/templates/spec.md#Check-Step-Rename
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'node:child_process';
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const cliPath = join(process.cwd(), 'bin/cli.js');
let testDir: string;

describe('bp template step mapping (review -> check)', () => {
  beforeAll(() => {
    testDir = join(tmpdir(), `bp-template-check-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('bp template check --stdout prints the check workflow instructions', () => {
    const output = execSync(`node ${cliPath} template check --stdout`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('bp dispatch fixer');
    expect(output).toContain('## Guardrails');
  });

  it('bp template review --stdout still prints the review.md artifact template', () => {
    const output = execSync(`node ${cliPath} template review --stdout`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('# Review:');
  });
});

describe('bp template design-system (T-7)', () => {
  beforeAll(() => {
    testDir = join(tmpdir(), `bp-template-design-${Date.now()}`);
    mkdirSync(testDir, { recursive: true });
    execSync(`node ${cliPath} init --dir ${testDir} --yes`, { encoding: 'utf-8', cwd: testDir });
  });

  afterAll(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('bp template design-system --stdout prints the DESIGN.md shape with no leftover placeholders', () => {
    const output = execSync(`node ${cliPath} template design-system --stdout`, { encoding: 'utf-8', cwd: testDir });
    expect(output).toContain('## Design System');
    for (const section of [
      '### Product Context',
      '### Aesthetic Direction',
      '### Typography',
      '### Color',
      '### Spacing',
      '### Layout',
      '### Motion',
      '### Decisions Log',
    ]) {
      expect(output).toContain(section);
    }
    expect(output).not.toContain('{{');
  });

  it('bp template design-system without --stdout writes a DESIGN.md file', () => {
    const outDir = join(testDir, 'tpl-out');
    execSync(`node ${cliPath} template design-system --dir ${outDir} --name demo`, { encoding: 'utf-8', cwd: testDir });
    const written = readFileSync(join(outDir, 'DESIGN.md'), 'utf-8');
    expect(written).toContain('## Design System');
    expect(written).toContain('### Decisions Log');
  });
});
