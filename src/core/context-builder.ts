import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderContextJsonl } from './context-jsonl-io.js';
import type { ContextRefRow } from '../types/context-jsonl-io.js';

const SPEC_REFERENCE_PATTERN = /\b(bp\/specs\/[A-Za-z0-9._-]+\/spec\.md(?:#[A-Za-z0-9._-]+)?)/g;
const CONVENTIONS_REFERENCE_PATTERN = /\b(bp\/conventions\/[A-Za-z0-9._-]+\.md)\b/g;
const BP_REFERENCE_PATTERN = /\bbp\/[A-Za-z0-9._/-]+\.[A-Za-z0-9._-]+\b/g;
const DEFAULT_REASON_PREFIX = 'referenced from';
const DEDUPE = (items: string[]): string[] => Array.from(new Set(items));
const CONVENTIONS_PATH_PREFIX = 'bp/conventions/';
const PROJECT_CONVENTION_REASON = 'project convention file';

function safeReadFile(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf-8') : null;
}

function tagForFile(file: string): string {
  if (file.includes('/specs/') && file.endsWith('spec.md')) return 'spec';
  if (file.startsWith(CONVENTIONS_PATH_PREFIX)) return 'convention';
  return 'artifact';
}

function stripAnchor(ref: string): string {
  return ref.split('#')[0];
}

function extractSpecReferences(content: string): string[] {
  const direct = content.match(SPEC_REFERENCE_PATTERN) ?? [];
  if (direct.length > 0) return direct;
  const fallback = content.match(BP_REFERENCE_PATTERN) ?? [];
  return fallback.filter((entry) => entry.includes('/specs/') && entry.endsWith('spec.md'));
}

function extractConventionReferences(content: string): string[] {
  const direct = content.match(CONVENTIONS_REFERENCE_PATTERN) ?? [];
  if (direct.length > 0) return direct;
  return (content.match(BP_REFERENCE_PATTERN) ?? []).filter((entry) => entry.startsWith(CONVENTIONS_PATH_PREFIX));
}

function makeRow(file: string, reason: string, tag: string): ContextRefRow {
  return { file, reason, phase: 'all', tag, read: 'full' };
}

function collectReferencesFromBody(
  content: string,
  sourceName: string,
  references: Map<string, ContextRefRow>,
): void {
  const specRefs = extractSpecReferences(content).map(stripAnchor);
  const conventionRefs = extractConventionReferences(content);
  const allRefs = DEDUPE([
    ...specRefs,
    ...conventionRefs,
    ...(content.match(BP_REFERENCE_PATTERN) ?? []).map(stripAnchor),
  ]);
  for (const ref of allRefs) {
    const path = ref.startsWith('bp/') ? ref : `bp/${ref}`;
    if (!references.has(path)) {
      references.set(path, makeRow(path, `${DEFAULT_REASON_PREFIX} ${sourceName}`, tagForFile(path)));
    }
  }
}

function addConventionsIfMissing(bpDir: string, rows: ContextRefRow[]): void {
  const conventionsDir = join(bpDir, 'conventions');
  if (!existsSync(conventionsDir)) return;
  if (rows.some((row) => row.file.startsWith(CONVENTIONS_PATH_PREFIX))) return;
  for (const entry of readdirSync(conventionsDir)) {
    rows.push(makeRow(`${CONVENTIONS_PATH_PREFIX}${entry}`, PROJECT_CONVENTION_REASON, 'convention'));
  }
}

/**
 * Build context.jsonl body for a change directory.
 *: When tasks.md has wave info, extract DS-N refs for the current wave
 * and set .range on design.md rows to target only those sections.
 */
export function buildContextJsonl(bpDir: string, changeDirPath: string): string {
  const files = ['proposal.md', 'design.md', 'tasks.md'].map((name) => join(changeDirPath, name));
  const references = new Map<string, ContextRefRow>();

  const tasksContent = safeReadFile(join(changeDirPath, 'tasks.md'));

  //: If tasks.md has wave info, extract DS-N refs for current wave
  // and set range on design.md rows to target only those sections.
  // DS-N range extraction: parse design.md for "## DS-N" headings,
  // match against wave DS refs in tasks.md, compute line ranges.
  // If range calculation fails, fall back to full design.md.
  let waveDSRefs: string[] | undefined;
  if (tasksContent !== null) {
    // Extract DS-N references from tasks.md (e.g., "spec_ref: DS-1" or "DS-1")
    const dsRefs = tasksContent.match(/\bDS-(\d+)\b/g);
    if (dsRefs && dsRefs.length > 0) {
      waveDSRefs = [...new Set(dsRefs)];
    }
  }

  for (const file of files) {
    const content = safeReadFile(file);
    if (content === null) continue;
    const sourceName = file.split('/').pop() ?? 'unknown';
    collectReferencesFromBody(content, sourceName, references);
  }

  //: Apply DS-N range filtering to design.md rows
  if (waveDSRefs && waveDSRefs.length > 0) {
    const designContent = safeReadFile(join(changeDirPath, 'design.md'));
    if (designContent !== null) {
      const dsRange = computeDSNRange(designContent, waveDSRefs);
      if (dsRange) {
        for (const [, row] of references) {
          if (row.file.endsWith('/design.md')) {
            row.range = dsRange;
            row.read = 'range';
          }
        }
      }
    }
  }

  const rows = Array.from(references.values());
  addConventionsIfMissing(bpDir, rows);
  // : Agent queries map on-demand via bp map commands, not by reading the whole .md
  // (the .codebase-map.md is NOT injected — agent uses bp map list/module/impact/search)
  return renderContextJsonl(rows);
}

/**: Compute merged DS-N line range from design.md content for given DS refs.
 * Returns a single [startLine, endLine] tuple covering all matched DS sections,
 * or undefined if none found. */
function computeDSNRange(designContent: string, dsRefs: string[]): [number, number] | undefined {
  const lines = designContent.split('\n');
  const targets = new Set(dsRefs);
  const ranges: [number, number][] = [];
  let currentDS: string | null = null;
  let startLine = 0;

  for (let i = 0; i < lines.length; i++) {
    const headingMatch = lines[i].match(/^##\s+(DS-\d+)\b/);
    if (headingMatch) {
      if (currentDS && targets.has(currentDS)) {
        ranges.push([startLine, i]);
      }
      currentDS = headingMatch[1];
      startLine = i + 1;
    }
  }
  if (currentDS && targets.has(currentDS)) {
    ranges.push([startLine, lines.length]);
  }

  if (ranges.length === 0) return undefined;
  // Merge all matched ranges into one contiguous span
  return [ranges[0][0], ranges[ranges.length - 1][1]];
}
