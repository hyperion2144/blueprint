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

/** Build context.jsonl body for a change directory. */
export function buildContextJsonl(bpDir: string, changeDirPath: string): string {
  const files = ['proposal.md', 'design.md', 'tasks.md'].map((name) => join(changeDirPath, name));
  const references = new Map<string, ContextRefRow>();

  for (const file of files) {
    const content = safeReadFile(file);
    if (content === null) continue;
    const sourceName = file.split('/').pop() ?? 'unknown';
    collectReferencesFromBody(content, sourceName, references);
  }

  const rows = Array.from(references.values());
  addConventionsIfMissing(bpDir, rows);
  return renderContextJsonl(rows);
}
