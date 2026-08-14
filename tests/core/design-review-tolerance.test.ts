/**
 * design-review-tolerance.test.ts — design-review.md artifact tolerance (T-7)
 *
 * T-7 RED: GIVEN a change directory containing design-review.md
 *          WHEN validateChange runs on it
 *          THEN the validation results contain a 'design-review' entry
 *               that is valid with zero errors
 *          AND bp continue's next-step output is byte-identical whether
 *              or not design-review.md is present (absence must not block).
 *
 * Spec: specs/design/spec.md#Design-Review-Artifact-Tolerance
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { validateChange } from '../../src/core/artifact-validator.js';
import { determineNextStepForChange } from '../../src/core/continue.js';
import { createBlueprintStructure, createChangeDir } from '../../src/core/file-tree.js';

const tmpDir = join(process.cwd(), 'tests/tmp-design-review');

beforeEach(() => {
  mkdirSync(tmpDir, { recursive: true });
  createBlueprintStructure(tmpDir);
  writeFileSync(join(tmpDir, 'config.yaml'), '', 'utf-8');
});

afterEach(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

function writeArtifact(changeName: string, file: string, content = '# test\n'): void {
  const dir = createChangeDir(tmpDir, changeName);
  writeFileSync(join(dir, file), content, 'utf-8');
}

function setupReviewedChange(changeName: string): void {
  writeArtifact(changeName, 'proposal.md');
  writeArtifact(changeName, 'design.md');
  mkdirSync(join(tmpDir, 'changes', changeName, 'specs'), { recursive: true });
  writeArtifact(changeName, 'tasks.md', '- [x] T-1\n');
  writeArtifact(changeName, 'review.md', '## Overall Verdict: PASS\n');
}

describe('design-review.md artifact tolerance (T-7)', () => {
  it('validateChange reports a present design-review.md as valid with zero errors', () => {
    writeArtifact('test-change', 'design-review.md', '# Design Review\n\n## Verdict\n');
    const results = validateChange(tmpDir, 'test-change');
    const reviewResult = results['design-review'];
    expect(reviewResult).toBeDefined();
    expect(reviewResult!.valid).toBe(true);
    expect(reviewResult!.errors).toEqual([]);
  });

  it('continue next-step output is byte-identical with and without design-review.md', () => {
    setupReviewedChange('test-change');

    const without = determineNextStepForChange(tmpDir, 'test-change');
    writeArtifact('test-change', 'design-review.md', '# Design Review\n');
    const withFile = determineNextStepForChange(tmpDir, 'test-change');

    expect(JSON.stringify(withFile)).toBe(JSON.stringify(without));
  });
});
