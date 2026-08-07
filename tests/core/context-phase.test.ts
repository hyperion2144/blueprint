/**
 * context-phase.test.ts — context.jsonl phase enum rename (review -> check)
 *
 * T-5 RED: GIVEN a change whose context.jsonl contains a row with `phase: check`
 *          WHEN `gateContextJsonl(bpDir, changeName, 'check')` runs
 *          THEN the file validates AND `review` is no longer a valid phase.
 *
 * Spec: specs/context/spec.md#Check-Phase-Value
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { createBlueprintStructure, createChangeDir } from '../../src/core/file-tree.js';
import { gateContextJsonl } from '../../src/commands/_utils.js';
import { validateContextJsonlFile } from '../../src/core/artifact-validator.js';

const root = join(process.cwd(), 'tests/tmp-context-phase');
let bpDir: string;

beforeEach(() => {
  mkdirSync(root, { recursive: true });
  bpDir = join(root, 'bp');
  createBlueprintStructure(bpDir);
  writeFileSync(join(bpDir, 'config.yaml'), '', 'utf-8');
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('context phase rename (review -> check)', () => {
  it('gateContextJsonl accepts a check-phase context.jsonl', () => {
    const change = createChangeDir(bpDir, 'test-change');
    writeFileSync(join(change, 'proposal.md'), '# Proposal\n', 'utf-8');
    writeFileSync(
      join(change, 'context.jsonl'),
      JSON.stringify({
        file: 'bp/changes/test-change/proposal.md',
        reason: 'proposal for the change',
        phase: 'check',
        read: 'full',
      }) + '\n',
      'utf-8',
    );
    expect(gateContextJsonl(bpDir, 'test-change', 'check')).toBe(true);
  });

  it('validateContextJsonlFile accepts phase check and rejects phase review', () => {
    const change = createChangeDir(bpDir, 'test-change');
    writeFileSync(join(change, 'proposal.md'), '# Proposal\n', 'utf-8');

    const checkPath = join(change, 'context-check.jsonl');
    writeFileSync(
      checkPath,
      JSON.stringify({
        file: 'bp/changes/test-change/proposal.md',
        reason: 'proposal for the change',
        phase: 'check',
        read: 'full',
      }) + '\n',
      'utf-8',
    );
    expect(validateContextJsonlFile(checkPath, bpDir, 'check').valid).toBe(true);

    const reviewPath = join(change, 'context-review.jsonl');
    writeFileSync(
      reviewPath,
      JSON.stringify({
        file: 'bp/changes/test-change/proposal.md',
        reason: 'proposal for the change',
        phase: 'review',
        read: 'full',
      }) + '\n',
      'utf-8',
    );
    // After the rename, `review` is no longer a valid phase value.
    expect(validateContextJsonlFile(reviewPath, bpDir, 'check').valid).toBe(false);
  });
});
