/**
 * refactor-analyzer — deterministic evidence engine for the refactor workflow.
 *
 * Computes per-module findings for the four anti-pattern metrics
 * (fragmentation, duplication, flatness, low reuse) plus a depth ratio,
 * and renders a stable Markdown report consumed by the refactorer
 * sub-agent. No clock / randomness / environment-dependent bytes enter
 * the report — two runs on the same input and thresholds are
 * byte-identical.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { CodebaseMap, FileSummary, ModuleSummary } from './parsers/parser-base.js';
import type { RefactorThresholds } from '../types/index.js';

/** One fragmented-file finding inside a module. */
export interface FragmentationFinding {
  file: string;
  exports: number;
  nonBlankLines: number;
  exportsMax: number;
  fileLinesMax: number;
}

/** One cross-file duplicated-block pair. */
export interface DuplicationPair {
  leftPath: string;
  rightPath: string;
  similarity: number;
  similarityMin: number;
  gramSize: number;
  sampleShingles: string[];
}

/** Flatness evidence for a module. */
export interface FlatnessFinding {
  module: string;
  depth: number;
  maxDepth: number;
  subdirCount: number;
  siblingDirCount: number;
  subdirMin: number;
}

/** Low-reuse evidence for a module. */
export interface LowReuseFinding {
  module: string;
  fanIn: number;
  fanInMax: number;
  exports: number;
  exportsMin: number;
}

/** Per-module analysis result (one entry per analyzed module). */
export interface ModuleAnalysis {
  module: string;
  files: string[];
  exports: string[];
  fanIn: number;
  depthRatio: number;
  fragmentation: FragmentationFinding[];
  duplication: DuplicationPair[];
  flat: boolean;
  flatness: FlatnessFinding | null;
  lowReuse: LowReuseFinding | null;
}

export interface AnalyzerOptions {
  rootDir: string;
  target: string;
  thresholds: RefactorThresholds;
  map: CodebaseMap;
}

export interface AnalyzerResult {
  /** Deterministic Markdown document (`# Refactor Report`). */
  report: string;
  /** One-line human summary for stdout. */
  summary: string;
  /** Per-module evidence, in map (lexicographic) order. */
  perModule: ModuleAnalysis[];
  /** SHA-256 of the report — dedupe key for consecutive analyze runs. */
  fingerprint: string;
}

const REPORT_FILE = '.refactor-report.md';

// ---------------------------------------------------------------------------
// Deterministic helpers
// ---------------------------------------------------------------------------

/** Non-blank line count (fragmentation + depth-ratio input). */
function countNonBlankLines(content: string): number {
  return content.split('\n').filter((l) => l.trim().length > 0).length;
}

/** Lowercased word tokens — duplication shingle alphabet. */
function tokenize(content: string): string[] {
  return content.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** Set of n-gram shingles (windows of `gramSize` consecutive tokens). */
function shingles(tokens: string[], gramSize: number): Set<string> {
  const out = new Set<string>();
  for (let i = 0; i + gramSize <= tokens.length; i++) {
    out.add(tokens.slice(i, i + gramSize).join(' '));
  }
  return out;
}

/** True when the module's on-disk directory contains any subdirectory. */
function hasSubdirectory(rootDir: string, modulePath: string): boolean {
  const dir = join(rootDir, modulePath);
  if (!existsSync(dir)) return false;
  return readdirSync(dir, { withFileTypes: true }).some(
    (e) => e.isDirectory() && !e.name.startsWith('.'),
  );
}

/** Number of directory siblings at the module's parent level. */
function countSiblingDirectories(rootDir: string, modulePath: string): number {
  const parent = dirname(modulePath);
  if (!parent || parent === '.' || parent === '/') return 0;
  const dir = join(rootDir, parent);
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).filter(
    (e) => e.isDirectory() && !e.name.startsWith('.'),
  ).length;
}

/** Modules in scope, sorted by name (map order). */
function selectModules(map: CodebaseMap, target: string): ModuleSummary[] {
  const trimmed = target.trim();
  const modules = trimmed === '' || trimmed === '.'
    ? [...map.modules]
    : map.modules.filter((m) => m.name === trimmed || m.name.startsWith(`${trimmed}/`));
  return modules.sort((a, b) => a.name.localeCompare(b.name));
}

/** fanIn per module: count of other modules listing it in depends_on. */
function computeFanIn(map: CodebaseMap): Map<string, number> {
  const fanIn = new Map<string, number>();
  for (const mod of map.modules) {
    for (const dep of mod.depends_on) {
      fanIn.set(dep, (fanIn.get(dep) ?? 0) + 1);
    }
  }
  return fanIn;
}

/** Read a source file's content; returns '' on any filesystem error. */
function readFileSafe(rootDir: string, filePath: string): string {
  try {
    return readFileSync(join(rootDir, filePath), 'utf-8');
  } catch {
    return '';
  }
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

// ---------------------------------------------------------------------------
// Metric computations
// ---------------------------------------------------------------------------

/** Fragmentation: every file <= exportsMax exports AND at least one file <= fileLinesMax lines. */
function fragmentationFindings(
  rootDir: string,
  files: FileSummary[],
  thresholds: RefactorThresholds,
): FragmentationFinding[] {
  const { exportsMax, fileLinesMax } = thresholds.fragmentation;
  if (files.length === 0) return [];
  if (files.some((f) => f.exports.length > exportsMax)) return [];
  const findings: FragmentationFinding[] = [];
  for (const f of files) {
    const lines = countNonBlankLines(readFileSafe(rootDir, f.path));
    if (lines <= fileLinesMax) {
      findings.push({ file: f.path, exports: f.exports.length, nonBlankLines: lines, exportsMax, fileLinesMax });
    }
  }
  return findings;
}

/** Duplication: cross-file n-gram similarity pairs within the analyzed scope. */
function duplicationPairs(
  rootDir: string,
  files: FileSummary[],
  thresholds: RefactorThresholds,
): DuplicationPair[] {
  const { similarityMin, gramSize } = thresholds.duplication;
  const pairs: DuplicationPair[] = [];

  const entries: Array<{ path: string; shingles: Set<string>; sorted: string[] }> = [];
  for (const f of files) {
    const tokens = tokenize(readFileSafe(rootDir, f.path));
    if (tokens.length < gramSize) continue;
    const shingleSet = shingles(tokens, gramSize);
    entries.push({ path: f.path, shingles: shingleSet, sorted: [...shingleSet].sort() });
  }

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      let shared = 0;
      const smaller = a.shingles.size <= b.shingles.size ? a : b;
      for (const s of smaller.shingles) {
        if (a.shingles.has(s) && b.shingles.has(s)) shared++;
      }
      if (shared === 0 || smaller.shingles.size === 0) continue;
      const similarity = shared / smaller.shingles.size;
      if (similarity >= similarityMin) {
        const left = a.path.localeCompare(b.path) <= 0 ? a : b;
        const right = left === a ? b : a;
        // sampleShingles: first three shared shingles, lexicographic for stability.
        const sampleShingles: string[] = [];
        for (const s of smaller.sorted) {
          if (a.shingles.has(s) && b.shingles.has(s)) {
            sampleShingles.push(s);
            if (sampleShingles.length === 3) break;
          }
        }
        pairs.push({
          leftPath: left.path,
          rightPath: right.path,
          similarity,
          similarityMin,
          gramSize,
          sampleShingles,
        });
      }
    }
  }
  return pairs;
}

/** Flatness: no subdirectory below the module root, or too few sibling dirs at its level. */
function flatnessFinding(
  rootDir: string,
  modulePath: string,
  thresholds: RefactorThresholds,
): FlatnessFinding | null {
  const { maxDepth, subdirMin } = thresholds.flatness;
  const subdirCount = hasSubdirectory(rootDir, modulePath) ? 1 : 0;
  const depth = 1 + subdirCount;
  const siblingDirCount = countSiblingDirectories(rootDir, modulePath);
  if (depth <= maxDepth || siblingDirCount < subdirMin) {
    return { module: modulePath, depth, maxDepth, subdirCount, siblingDirCount, subdirMin };
  }
  return null;
}

/** Low reuse: fanIn <= fanInMax AND exports >= exportsMin. */
function lowReuseFinding(
  modulePath: string,
  fanIn: number,
  exports: string[],
  thresholds: RefactorThresholds,
): LowReuseFinding | null {
  const { fanInMax, exportsMin } = thresholds.lowReuse;
  if (fanIn <= fanInMax && exports.length >= exportsMin) {
    return { module: modulePath, fanIn, fanInMax, exports: exports.length, exportsMin };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Report rendering
// ---------------------------------------------------------------------------

function fmtThresholds(t: RefactorThresholds): string {
  return [
    `fragmentation exportsMax=${t.fragmentation.exportsMax} fileLinesMax=${t.fragmentation.fileLinesMax}`,
    `duplication similarityMin=${t.duplication.similarityMin} gramSize=${t.duplication.gramSize}`,
    `flatness maxDepth=${t.flatness.maxDepth} subdirMin=${t.flatness.subdirMin}`,
    `lowReuse fanInMax=${t.lowReuse.fanInMax} exportsMin=${t.lowReuse.exportsMin}`,
  ].join(' | ');
}

function renderModuleSection(m: ModuleAnalysis): string {
  const lines: string[] = [];
  lines.push(`## Module: ${m.module}`);
  lines.push('');
  lines.push(`- Files: ${m.files.join(', ')}`);
  if (m.exports.length > 0) lines.push(`- Exports: ${m.exports.join(', ')}`);
  lines.push(`- Fan-in: ${m.fanIn}`);
  lines.push(`- Depth ratio: ${m.depthRatio.toFixed(2)}`);
  lines.push('');

  if (m.fragmentation.length > 0) {
    lines.push('### Fragmentation');
    lines.push('');
    for (const f of m.fragmentation) {
      lines.push(
        `- ${f.file} — ${f.exports} exports, ${f.nonBlankLines} non-blank lines (exportsMax ${f.exportsMax}, fileLinesMax ${f.fileLinesMax})`,
      );
    }
    lines.push('');
  }

  if (m.duplication.length > 0) {
    lines.push('### Duplication');
    lines.push('');
    for (const d of m.duplication) {
      lines.push(
        `- ${d.leftPath} <-> ${d.rightPath} — similarity ${d.similarity.toFixed(2)} (min ${d.similarityMin}, gramSize ${d.gramSize})`,
      );
      for (const s of d.sampleShingles) lines.push(`  - sample shingle: \`${s}\``);
    }
    lines.push('');
  }

  if (m.flatness) {
    lines.push('### Flatness');
    lines.push('');
    lines.push(`- depth ${m.flatness.depth} (maxDepth ${m.flatness.maxDepth})`);
    lines.push(`- subdirectories under ${m.module}: ${m.flatness.subdirCount}`);
    lines.push(`- sibling directories at parent level: ${m.flatness.siblingDirCount} (subdirMin ${m.flatness.subdirMin})`);
    lines.push('');
  }

  if (m.lowReuse) {
    lines.push('### Low Reuse');
    lines.push('');
    lines.push(`- fan-in ${m.lowReuse.fanIn} (fanInMax ${m.lowReuse.fanInMax}), exports ${m.lowReuse.exports} (exportsMin ${m.lowReuse.exportsMin})`);
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run the deterministic analyzer over the given codebase map scope.
 * `target` is `.` / `''` (whole repo) or a module path prefix.
 */
export function runRefactorAnalyzer(opts: AnalyzerOptions): AnalyzerResult {
  const { rootDir, target, thresholds, map } = opts;
  const modules = selectModules(map, target);
  const fanIn = computeFanIn(map);

  const perModule: ModuleAnalysis[] = [];
  for (const mod of modules) {
    const files = [...mod.files].sort((a, b) => a.path.localeCompare(b.path));
    const mFanIn = fanIn.get(mod.name) ?? 0;

    let totalLines = 0;
    for (const f of files) totalLines += countNonBlankLines(readFileSafe(rootDir, f.path));
    const depthRatio = totalLines / Math.max(1, mod.public_api.length) + Math.log1p(mFanIn);

    const flat = flatnessFinding(rootDir, mod.name, thresholds);

    perModule.push({
      module: mod.name,
      files: files.map((f) => f.path),
      exports: [...mod.public_api].sort(),
      fanIn: mFanIn,
      depthRatio,
      fragmentation: fragmentationFindings(rootDir, files, thresholds),
      duplication: duplicationPairs(rootDir, files, thresholds),
      flat: flat !== null,
      flatness: flat,
      lowReuse: lowReuseFinding(mod.name, mFanIn, mod.public_api, thresholds),
    });
  }

  const fragmentedCount = perModule.filter((m) => m.fragmentation.length > 0).length;
  const fragmentedFiles = perModule.reduce((n, m) => n + m.fragmentation.length, 0);
  const duplicationCount = perModule.reduce((n, m) => n + m.duplication.length, 0);
  const flatCount = perModule.filter((m) => m.flat).length;
  const lowReuseCount = perModule.filter((m) => m.lowReuse !== null).length;

  const ratios = perModule.map((m) => m.depthRatio);
  const med = median(ratios);
  const deepest = ratios.length > 0 ? perModule[ratios.indexOf(Math.max(...ratios))] : null;

  const summary =
    `Refactor report for ${target}: ${fragmentedCount} fragmented, ${duplicationCount} duplicated pairs, ` +
    `${flatCount} flat, ${lowReuseCount} low-reuse. ` +
    (med === null
      ? 'No modules analyzed.'
      : `Median depth ratio ${med.toFixed(2)} (deepest: ${deepest!.module}).`) +
    ` See bp/${REPORT_FILE}.`;

  const reportLines: string[] = [];
  reportLines.push(`# Refactor Report`);
  reportLines.push('');
  reportLines.push(`**Target**: ${target}`);
  reportLines.push('');
  reportLines.push(`**Thresholds**: ${fmtThresholds(thresholds)}`);
  reportLines.push('');
  reportLines.push('## Summary');
  reportLines.push('');
  reportLines.push(`- Fragmented modules: ${fragmentedCount} (${fragmentedFiles} files)`);
  reportLines.push(`- Duplication pairs: ${duplicationCount}`);
  reportLines.push(`- Flat modules: ${flatCount}`);
  reportLines.push(`- Low-reuse modules: ${lowReuseCount}`);
  if (med === null) {
    reportLines.push('- Depth ratio: n/a (no modules analyzed)');
  } else {
    reportLines.push(
      `- Depth ratio: min ${Math.min(...ratios).toFixed(2)} / median ${med.toFixed(2)} / max ${Math.max(...ratios).toFixed(2)} (deepest: ${deepest!.module})`,
    );
  }
  reportLines.push('');
  for (const m of perModule) {
    reportLines.push(renderModuleSection(m));
  }

  const report = reportLines.join('\n').replace(/\n+$/, '') + '\n';
  const fingerprint = createHash('sha256').update(report).digest('hex');

  return { report, summary, perModule, fingerprint };
}

/**
 * Write the report to `<bpDir>/.refactor-report.md` (creates `bp/` if missing).
 * The file content is byte-identical to `report`.
 */
export function writeRefactorReport(bpDir: string, report: string): void {
  const reportPath = join(bpDir, REPORT_FILE);
  mkdirSync(dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, report, 'utf-8');
}

/** Read `<bpDir>/.refactor-report.md`; returns undefined when missing. */
export function readRefactorReport(bpDir: string): string | undefined {
  const reportPath = join(bpDir, REPORT_FILE);
  if (!existsSync(reportPath)) return undefined;
  try {
    return readFileSync(reportPath, 'utf-8');
  } catch {
    return undefined;
  }
}
