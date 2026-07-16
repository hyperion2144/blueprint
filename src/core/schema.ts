/**
 * v2 schema - YAML schema loading and step dependency graph
 * Defines the workflow as a data structure, not hardcoded in continue.ts.
 * continue.ts reads the schema to determine the next step.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/** Artifact definition in a schema */
export interface SchemaArtifact {
  id: string;
  generates: string;
  requires: string[];
  /** Workflow command that produces this artifact */
  command?: string;
  description?: string;
}

/** Action step (apply/review/archive) in a schema */
export interface SchemaStep {
  id: string;
  requires: string[];
  /** Workflow command for this step */
  command: string;
  /** How to check if this step is complete */
  completion: 'file_exists' | 'tasks_all_checked' | 'review_exists' | 'review_pass';
  /** File to check for completion (if applicable) */
  tracks?: string;
  /** Sub-agent to dispatch */
  dispatch?: string;
}

/** Schema definition */
export interface SchemaDef {
  name: string;
  version?: number;
  description?: string;
  /** Artifact-producing steps (proposal, design, specs, tasks) */
  artifacts: SchemaArtifact[];
  /** Action steps in order (apply, review, archive) */
  steps: SchemaStep[];
}

/** Built-in default schema (spec-driven) */
export const DEFAULT_SCHEMA: SchemaDef = {
  name: 'spec-driven',
  version: 2,
  description: 'Spec-driven development with structured design and sub-agent dispatch',
  artifacts: [
    { id: 'proposal', generates: 'proposal.md', requires: [], command: 'propose', description: 'Why + what + scope + deliverables' },
    { id: 'design', generates: 'design.md', requires: ['proposal'], command: 'plan', description: 'Structured technical design' },
    { id: 'specs', generates: 'specs/**/*.md', requires: ['proposal'], command: 'plan', description: 'Delta specs (ADDED/MODIFIED/REMOVED)' },
    { id: 'tasks', generates: 'tasks.md', requires: ['design', 'specs'], command: 'plan', description: 'Structured task checklist' },
  ],
  steps: [
    { id: 'apply', requires: ['tasks'], command: 'apply', completion: 'tasks_all_checked', tracks: 'tasks.md', dispatch: 'executor' },
    { id: 'review', requires: ['apply'], command: 'review', completion: 'review_exists', dispatch: 'reviewer' },
    { id: 'archive', requires: ['review'], command: 'archive', completion: 'review_pass' },
  ],
};

/** Load schema from bp/schemas/<name>/schema.yaml, or return default */
export function loadSchema(bpDir: string, schemaName?: string): SchemaDef {
  if (!schemaName) {
    try {
      const configPath = join(bpDir, 'config.yaml');
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf-8');
        const config = parse(content);
        schemaName = config?.schema ?? 'spec-driven';
      }
    } catch {
      // ignore
    }
  }

  if (!schemaName || schemaName === 'spec-driven') {
    return DEFAULT_SCHEMA;
  }

  const schemaPath = join(bpDir, 'schemas', schemaName, 'schema.yaml');
  if (!existsSync(schemaPath)) {
    return DEFAULT_SCHEMA;
  }

  const content = readFileSync(schemaPath, 'utf-8');
  return parse(content) as SchemaDef;
}
