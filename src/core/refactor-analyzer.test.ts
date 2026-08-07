/**
 * Deterministic refactor analyzer (T-7).
 *
 * Fixture tree shapes (one module each, 5 map modules total):
 *  - src/frag        — two fragmented sibling files (<=2 exports, <=50 non-blank lines)
 *  - src/dup         — one duplicated 15-gram block pair across two files
 *  - src/flat        — one flat module (no subdirectory)
 *  - src/lowreuse    — one low-reuse module (fanIn 0, exports >= 3)
 *  - src/wellshaped  — one well-shaped module (no findings)
 *
 * Every module except src/flat carries a non-source `misc/` subdirectory so
 * the flatness metric only fires for src/flat. src/flat and src/wellshaped
 * each have fanIn 2 (two modules import them), so low-reuse only fires for
 * src/lowreuse.
 */

import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';

import { generateCodebaseMap } from './codebase-map.js';
import { MiNotFoundError, runRefactorAnalyzer, writeRefactorReport, readRefactorReport } from './refactor-analyzer.js';
import { DEFAULT_REFACTOR_THRESHOLDS } from './config.js';

/** 24 distinct words per line, plus a unique per-line token — 15-gram windows stay unique. */
const GREEK_LINE = 'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega';

const dupBlock = (lines: number): string =>
  Array.from({ length: lines }, (_, i) => `// ${GREEK_LINE} line${String(i).padStart(4, '0')}`).join('\n');

function writeFile(root: string, relPath: string, content: string): void {
  const full = join(root, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, content, 'utf-8');
}

/** Build the 5-shape fixture tree; returns the fixture root. */
function buildFixture(root: string): void {
  // Fragmented siblings: each <=2 exports and <=50 non-blank lines.
  writeFile(root, 'src/frag/a.ts', [
    '// Fragmented sibling A',
    "import { fA } from '../flat.js';",
    '',
    'export function aOne(): number {',
    '  return fA();',
    '}',
    '',
  ].join('\n'));
  writeFile(root, 'src/frag/b.ts', [
    '// Fragmented sibling B',
    "import { alpha } from '../wellshaped.js';",
    '',
    'export function bOne(): number {',
    '  return alpha();',
    '}',
    '',
  ].join('\n'));
  writeFile(root, 'src/frag/misc/README.md', '# frag misc\n');

  // Duplicated block pair: two.ts is one.ts plus a trailing extra block.
  const oneTs = [
    '// Duplicated implementation block (file one)',
    "import { alpha } from '../wellshaped.js';",
    '',
    'export function one(): number {',
    '  return alpha();',
    '}',
    '',
    dupBlock(60),
    '',
  ].join('\n');
  writeFile(root, 'src/dup/one.ts', oneTs);
  writeFile(root, 'src/dup/two.ts', [
    '// Duplicated implementation block (file two)',
    "import { alpha } from '../wellshaped.js';",
    '',
    'export function two(): number {',
    '  return alpha();',
    '}',
    '',
    dupBlock(60),
    '',
    dupBlock(8),
    '',
  ].join('\n'));
  writeFile(root, 'src/dup/misc/README.md', '# dup misc\n');

  // Flat module: three exports (not fragmented), fanIn 2 (not low-reuse), no subdirectory.
  writeFile(root, 'src/flat/index.ts', [
    '// Flat module index',
    '',
    'export function fA(): number {',
    '  return 1;',
    '}',
    '',
    'export function fB(): number {',
    '  return 2;',
    '}',
    '',
    'export function fC(): number {',
    '  return 3;',
    '}',
    '',
  ].join('\n'));

  // Low-reuse module: fanIn 0, exports >= 3.
  writeFile(root, 'src/lowreuse/utils.ts', [
    '// Low-reuse utility module',
    "import { fA } from '../flat.js';",
    '',
    'export function uA(): number {',
    '  return fA();',
    '}',
    '',
    'export function uB(): number {',
    '  return 2;',
    '}',
    '',
    'export function uC(): number {',
    '  return 3;',
    '}',
    '',
  ].join('\n'));
  writeFile(root, 'src/lowreuse/misc/README.md', '# lowreuse misc\n');

  // Well-shaped module: fanIn 2, subdirectory present, no anti-pattern.
  writeFile(root, 'src/wellshaped/index.ts', [
    '// Well-shaped module with internal structure',
    '',
    'export function alpha(): number {',
    '  return 1;',
    '}',
    '',
    'export function beta(): number {',
    '  return 2;',
    '}',
    '',
    'export function gamma(): number {',
    '  return 3;',
    '}',
    '',
  ].join('\n'));
  writeFile(root, 'src/wellshaped/inner/README.md', '# wellshaped inner\n');
}

describe('runRefactorAnalyzer (T-7)', () => {
  it('reports the four anti-pattern metrics with exactly the expected per-module evidence', () => {
    const root = join(tmpdir(), `refactor-fixture-${Date.now()}`);
    buildFixture(root);
    try {
      const map = generateCodebaseMap(root);
      const result = runRefactorAnalyzer({
        rootDir: root,
        target: '.',
        thresholds: DEFAULT_REFACTOR_THRESHOLDS,
        map,
      });

      // Five fixture modules analyzed.
      expect(result.perModule).toHaveLength(5);

      // Fragmentation: exactly one module with two fragmented file findings.
      const fragmented = result.perModule.filter((m) => m.fragmentation.length > 0);
      expect(fragmented).toHaveLength(1);
      expect(fragmented[0].fragmentation).toHaveLength(2);

      // Duplication: exactly one module with at least one pair.
      const duplicated = result.perModule.filter((m) => m.duplication.length > 0);
      expect(duplicated).toHaveLength(1);
      expect(duplicated[0].duplication.length).toBeGreaterThanOrEqual(1);

      // Flatness: exactly one flat module.
      const flat = result.perModule.filter((m) => m.flat === true);
      expect(flat).toHaveLength(1);

      // Low reuse: exactly one module with fanIn 0 (and exports >= 3).
      const lowReuse = result.perModule.filter((m) => m.lowReuse !== null);
      expect(lowReuse).toHaveLength(1);
      expect(lowReuse[0].lowReuse!.fanIn).toBe(0);

      // Well-shaped module triggers no finding at all.
      const wellShaped = result.perModule.find((m) => m.module === 'src/wellshaped')!;
      expect(wellShaped).toBeDefined();
      expect(wellShaped.fragmentation).toHaveLength(0);
      expect(wellShaped.duplication).toHaveLength(0);
      expect(wellShaped.flat).toBe(false);
      expect(wellShaped.lowReuse).toBeNull();

      // Report layout: ## Summary precedes ## Module: blocks.
      expect(result.report).toContain('# Refactor Report');
      expect(result.report).toContain('## Summary');
      expect(result.report).toContain('## Module:');
      expect(result.report.indexOf('## Summary')).toBeLessThan(result.report.indexOf('## Module:'));

      // Determinism: a second run yields identical report and fingerprint.
      const again = runRefactorAnalyzer({
        rootDir: root,
        target: '.',
        thresholds: DEFAULT_REFACTOR_THRESHOLDS,
        map,
      });
      expect(again.report).toBe(result.report);
      expect(again.fingerprint).toBe(result.fingerprint);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('writeRefactorReport / readRefactorReport round-trip the report byte-for-byte', () => {
    const root = join(tmpdir(), `refactor-fixture-${Date.now()}`);
    buildFixture(root);
    try {
      const bpDir = join(root, 'bp');
      const map = generateCodebaseMap(root);
      const result = runRefactorAnalyzer({
        rootDir: root,
        target: '.',
        thresholds: DEFAULT_REFACTOR_THRESHOLDS,
        map,
      });
      writeRefactorReport(bpDir, result.report);
      expect(readRefactorReport(bpDir)).toBe(result.report);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('throws MiNotFoundError when a non-"." target resolves to no module (Q3)', () => {
    const root = join(tmpdir(), `refactor-missing-${Date.now()}`);
    buildFixture(root);
    try {
      const map = generateCodebaseMap(root);
      expect(() =>
        runRefactorAnalyzer({
          rootDir: root,
          target: 'src/nope',
          thresholds: DEFAULT_REFACTOR_THRESHOLDS,
          map,
        }),
      ).toThrow(MiNotFoundError);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
