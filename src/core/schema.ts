/**
 * v2 schema - YAML schema loading and artifact dependency graph
 * Replaces PEG grammar validation with lightweight schema definitions.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';

/** Artifact definition in a schema */
export interface SchemaArtifact {
  id: string;
  generates: string;
  requires: string[];
  description?: string;
}

/** Schema definition */
export interface SchemaDef {
  name: string;
  version?: number;
  description?: string;
  artifacts: SchemaArtifact[];
  apply?: { requires: string[]; tracks: string; dispatch?: string };
  review?: { requires: string[]; dispatch?: string; dimensions?: string[] };
  archive?: { requires: string[]; merges?: string[] };
}

/** Built-in default schema (spec-driven) */
export const DEFAULT_SCHEMA: SchemaDef = {
  name: 'spec-driven',
  version: 2,
  description: 'Spec-driven development with structured design and sub-agent dispatch',
  artifacts: [
    { id: 'proposal', generates: 'proposal.md', requires: [], description: 'Why + what + scope + deliverables' },
    { id: 'design', generates: 'design.md', requires: ['proposal'], description: 'Structured technical design' },
    { id: 'specs', generates: 'specs/**/*.md', requires: ['proposal'], description: 'Delta specs (ADDED/MODIFIED/REMOVED)' },
    { id: 'tasks', generates: 'tasks.md', requires: ['design', 'specs'], description: 'Structured task checklist' },
  ],
  apply: { requires: ['tasks'], tracks: 'tasks.md', dispatch: 'executor' },
  review: { requires: ['apply'], dispatch: 'reviewer', dimensions: ['spec', 'quality', 'goal'] },
  archive: { requires: ['review'], merges: ['specs'] },
};

/** Load schema from bp/schemas/<name>/schema.yaml, or return default */
export function loadSchema(bpDir: string, schemaName?: string): SchemaDef {
  if (!schemaName) {
    // Try to read from config
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

  // Try to load custom schema
  const schemaPath = join(bpDir, 'schemas', schemaName, 'schema.yaml');
  if (!existsSync(schemaPath)) {
    return DEFAULT_SCHEMA;
  }

  const content = readFileSync(schemaPath, 'utf-8');
  return parse(content) as SchemaDef;
}

/** Get the next artifact(s) that can be created based on what exists */
export function getNextArtifacts(schema: SchemaDef, existingArtifacts: string[]): string[] {
  const next: string[] = [];
  for (const artifact of schema.artifacts) {
    if (existingArtifacts.includes(artifact.id)) continue;
    // Check if all requirements are met
    const requirementsMet = artifact.requires.every((req) => existingArtifacts.includes(req));
    if (requirementsMet) {
      next.push(artifact.id);
    }
  }
  return next;
}

/** Get all artifact IDs in the schema */
export function getArtifactIds(schema: SchemaDef): string[] {
  return schema.artifacts.map((a) => a.id);
}
