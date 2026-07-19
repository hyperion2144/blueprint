import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ContextRefRowSchema } from '../types/context-refs.js';
import type {
  ContextJsonlError,
  ContextRefRow,
} from '../types/context-refs.js';

export interface ParseContextJsonlResult {
  rows: ContextRefRow[];
  errors: ContextJsonlError[];
}

export interface ValidateContextJsonlOpts {
  bpDir: string;
  currentPhase: 'plan' | 'apply' | 'review' | 'archive';
}

export interface ContextValidationResult {
  valid: boolean;
  rows: ContextRefRow[];
  errors: ContextJsonlError[];
  filteredOut: {
    total: number;
    byPhase: number;
  };
}

type ContextRowWithLine = ContextRefRow & { __contextJsonlLine?: number };

function schemaErrorMessage(issues: { path: PropertyKey[]; message: string }[]): string {
  return issues
    .map((issue) => `${issue.path.join('.') || 'row'}: ${issue.message}`)
    .join('; ');
}

function contextError(line: number, code: ContextJsonlError['code'], message: string): ContextJsonlError {
  return { line, code, message: `line ${line}: ${message}` };
}

function attachSourceLine(row: ContextRefRow, line: number): ContextRefRow {
  Object.defineProperty(row, '__contextJsonlLine', {
    value: line,
    enumerable: false,
    configurable: false,
  });
  return row;
}

/** Parse context.jsonl content while preserving valid row order and source lines. */
export function parseContextJsonl(content: string): ParseContextJsonlResult {
  const rows: ContextRefRow[] = [];
  const errors: ContextJsonlError[] = [];

  for (const [index, line] of content.split(/\r?\n/).entries()) {
    const lineNumber = index + 1;
    const trimmed = line.trim();
    if (!trimmed) continue;

    let value: unknown;
    try {
      value = JSON.parse(trimmed);
    } catch {
      errors.push(contextError(lineNumber, 'PARSE_ERROR', 'malformed JSON'));
      continue;
    }

    const parsed = ContextRefRowSchema.safeParse(value);
    if (!parsed.success) {
      errors.push(
        contextError(lineNumber, 'SCHEMA_ERROR', schemaErrorMessage(parsed.error.issues)),
      );
      continue;
    }

    rows.push(attachSourceLine(parsed.data, lineNumber));
  }

  return { rows, errors };
}

function contextFilePath(bpDir: string, file: string): string {
  const relative = file.startsWith('bp/') ? file.slice('bp/'.length) : file;
  return join(bpDir, relative);
}

function lineCount(content: string): number {
  if (content.length === 0) return 0;
  return content.split(/\r?\n/).length;
}

/** Validate rows relevant to the current workflow phase against files under bp/. */
export function validateContextJsonl(
  rows: ContextRefRow[],
  opts: ValidateContextJsonlOpts,
): ContextValidationResult {
  const errors: ContextJsonlError[] = [];
  const validRows: ContextRefRow[] = [];
  let byPhase = 0;

  for (const [index, rowValue] of rows.entries()) {
    const row = rowValue as ContextRowWithLine;
    const line = row.__contextJsonlLine ?? index + 1;
    if (row.phase !== 'all' && row.phase !== opts.currentPhase) {
      byPhase++;
      continue;
    }

    const filePath = contextFilePath(opts.bpDir, row.file);
    if (!existsSync(filePath)) {
      errors.push({
        line,
        code: 'PATH_UNRESOLVED',
        message: `line ${line}: referenced file '${row.file}' does not exist`,
      });
      continue;
    }

    if (row.read === 'range' && row.range) {
      const totalLines = lineCount(readFileSync(filePath, 'utf-8'));
      const [start, end] = row.range;
      if (start > totalLines || end > totalLines) {
        errors.push({
          line,
          code: 'RANGE_OOB',
          message: `line ${line}: range [${start}, ${end}] exceeds ${totalLines} lines in '${row.file}'`,
        });
        continue;
      }
    }

    validRows.push(rowValue);
  }

  return {
    valid: errors.length === 0,
    rows: validRows,
    errors,
    filteredOut: { total: rows.length, byPhase },
  };
}

/** Serialize context rows as newline-delimited JSON. */
export function renderContextJsonl(rows: ContextRefRow[]): string {
  return rows.map((row) => JSON.stringify(row)).join('\n');
}
