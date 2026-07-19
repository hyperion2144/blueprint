import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderContextJsonl } from './context-refs.js';
import type { ContextRefRow } from '../types/context-refs.js';

const SPEC_REFERENCE_PATTERN = /\b(bp\/specs\/[A-Za-z0-9._-]+\/spec\.md(?:#[A-Za-z0-9._-]+)?)/g;
const CONVENTIONS_REFERENCE_PATTERN = /\b(bp\/conventions\/[A-Za-z0-9._-]+\.md)\b/g;
const BP_REFERENCE_PATTERN = /\bbp\/[A-Za-z0-9._/-]+\.[A-Za-z0-9._-]+\b/g;

const DEFAULT_REASON_PREFIX = 'referenced from';
const DEDUPE = (items: string[]): string[] => Array.from(new Set(items));

/** Read a file safely, returning null when the file is missing. */
function safeReadFile(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf-8') : null;
}

/** Extract bp/specs references from a markdown body. */
function extractSpecReferences(content: string): string[] {
  const direct = content.match(SPEC_REFERENCE_PATTERN) ?? [];
  if (direct.length > 0) return direct;
  const fallback = content.match(BP_REFERENCE_PATTERN) ?? [];
  return fallback.filter((entry) => entry.includes('/specs/') && entry.endsWith('spec.md'));
}

/** Extract convention file references from a markdown body. */
function extractConventionReferences(content: string): string[] {
  const direct = content.match(CONVENTIONS_REFERENCE_PATTERN) ?? [];
  if (direct.length > 0) return direct;
  return (content.match(BP_REFERENCE_PATTERN) ?? []).filter((entry) => entry.startsWith('bp/conventions/'));
}

/** Build context.jsonl body for a change directory. */
export function buildContextJsonl(bpDir: string, changeDirPath: string): string {
  const files = ['proposal.md', 'design.md', 'tasks.md'].map((name) => join(changeDirPath, name));
  const references = new Map<string, ContextRefRow>();

  const tagForFile = (file: string): string => {
    if (file.includes('/specs/') && file.endsWith('spec.md')) return 'spec';
    if (file.startsWith('bp/conventions/')) return 'convention';
    return 'artifact';
  };

  const reasonForFile = (_file: string, source: string): string =>
    `${DEFAULT_REASON_PREFIX} ${source}`;

  for (const file of files) {
    const content = safeReadFile(file);
    if (content === null) continue;
    const specRefs = extractSpecReferences(content);
    const conventionRefs = extractConventionReferences(content);
    const allRefs = DEDUPE([...specRefs, ...conventionRefs, ...(content.match(BP_REFERENCE_PATTERN) ?? [])]);
    const sourceName = file.split('/').pop() ?? 'unknown';
    for (const ref of allRefs) {
      const normalised = ref.replace(/^bp\//, 'bp/');
      const path = normalised.startsWith('bp/') ? normalised : `bp/${normalised}`;
      if (!references.has(path)) {
        references.set(path, {
          file: path,
          reason: reasonForFile(path, sourceName),
          phase: 'all',
          tag: tagForFile(path),
        });
      }
    }
  }

  const rows = Array.from(references.values());
  const conventionsDir = join(bpDir, 'conventions');
  if (existsSync(conventionsDir) && !rows.some((row) => row.file.startsWith('bp/conventions/'))) {
    for (const entry of readdirSync(conventionsDir)) {
      rows.push({
        file: `bp/conventions/${entry}`,
        reason: 'project convention file',
        phase: 'all',
        tag: 'convention',
      });
    }
  }

  return renderContextJsonl(rows);
}
