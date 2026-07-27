/**
 * v2 schema - YAML schema loading and step dependency graph
 * Defines the workflow as a data structure, not hardcoded in continue.ts.
 * continue.ts reads the schema to determine the next step.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { parse } from 'yaml';
import { z } from 'zod';
import { loadConfig } from './config.js';

/** Strict regex for schema names — prevents path traversal via `config.schema`. */
const SCHEMA_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

/** Zod schema for `bp/schemas/<name>/schema.yaml` — replaces the raw cast. */
const SchemaArtifactSchema = z.object({
  id: z.string().min(1),
  generates: z.string().min(1),
  requires: z.array(z.string()).default([]),
  command: z.string().optional(),
  description: z.string().optional(),
  template: z.string().optional(),
});

const SchemaStepSchema = z.object({
  id: z.string().min(1),
  requires: z.array(z.string()).default([]),
  command: z.string().min(1),
  completion: z.enum(['file_exists', 'tasks_all_checked', 'review_exists', 'review_pass']),
  tracks: z.string().optional(),
  dispatch: z.string().optional(),
});

const SchemaAgentSchema = z.object({
  role: z.string().min(1),
  description: z.string().min(1),
  prompt: z.string().optional(),
  tools: z.array(z.string()).optional(),
});

const SchemaDefSchema = z.object({
  name: z.string().min(1),
  version: z.number().optional(),
  description: z.string().optional(),
  artifacts: z.array(SchemaArtifactSchema),
  steps: z.array(SchemaStepSchema),
  agents: z.array(SchemaAgentSchema).optional(),
});

/** Artifact definition in a schema */
export interface SchemaArtifact {
  id: string;
  generates: string;
  requires: string[];
  /** Workflow command that produces this artifact */
  command?: string;
  description?: string;
  /** Template file path (relative to schema dir) for custom schemas */
  template?: string;
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

/** Agent definition in a schema */
export interface SchemaAgent {
  role: string;
  description: string;
  /** Prompt file path (relative to schema dir) for custom schemas */
  prompt?: string;
  tools?: string[];
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
  /** Sub-agent definitions (planner, executor, reviewer, codebase-scanner) */
  agents?: SchemaAgent[];
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

/** Load schema from bp/schemas/<name>/schema.yaml, or return default.
 *  Validates both the schema name (path traversal guard) and the YAML
 *  structure (Zod) — previously a raw `as SchemaDef` cast. */
export function loadSchema(bpDir: string, schemaName?: string): SchemaDef {
  if (!schemaName) {
    try {
      const config = loadConfig(bpDir);
      schemaName = config.schema;
    } catch (e) {
      // config unreadable — surface the issue but fall back to default so
      // commands like `bp continue` still produce useful output.
      console.warn(`\u26a0 schema: config unreadable, using default schema: ${(e as Error).message}`);
    }
  }

  if (!schemaName || schemaName === 'spec-driven') {
    return DEFAULT_SCHEMA;
  }

  // Validate schema name — prevents `schema: '../../etc'` traversal.
  if (!SCHEMA_NAME_RE.test(schemaName)) {
    throw new Error(
      `Invalid schema name: ${JSON.stringify(schemaName)}. ` +
      `Allowed: alphanumeric, '.', '_', '-'.`,
    );
  }

  const schemaPath = join(bpDir, 'schemas', schemaName, 'schema.yaml');
  // Defense-in-depth: assert the resolved path stays under bp/schemas/.
  const schemasRoot = resolve(join(bpDir, 'schemas')) + sep;
  if (!resolve(schemaPath).startsWith(schemasRoot)) {
    throw new Error(`Path traversal blocked: schema path escapes bp/schemas/`);
  }
  if (!existsSync(schemaPath)) {
    return DEFAULT_SCHEMA;
  }

  const content = readFileSync(schemaPath, 'utf-8');
  const raw = parse(content);
  // Validate structure through Zod — surfaces malformed schemas early
  // instead of letting undefined `step.completion` values crash continue.ts.
  return SchemaDefSchema.parse(raw) as SchemaDef;
}

// ── Resolution functions: custom schema files -> built-in TypeScript fallback ──

/** Get the schema directory path for a custom schema */
export function getSchemaDir(bpDir: string, schemaName?: string): string | null {
  if (!schemaName) {
    try {
      const config = loadConfig(bpDir);
      schemaName = config.schema;
    } catch (e) {
      console.warn(`\u26a0 schema: config unreadable, using default schema: ${(e as Error).message}`);
    }
  }
  if (!schemaName || schemaName === 'spec-driven') return null;
  if (!SCHEMA_NAME_RE.test(schemaName)) {
    throw new Error(`Invalid schema name: ${JSON.stringify(schemaName)}`);
  }
  const dir = join(bpDir, 'schemas', schemaName);
  return existsSync(dir) ? dir : null;
}

/** Check if the project uses a custom schema (not built-in spec-driven) */
export function isCustomSchema(bpDir: string): boolean {
  return getSchemaDir(bpDir) !== null;
}

/** Resolve a workflow instruction: custom schema file -> built-in TypeScript */
export function resolveInstruction(bpDir: string, step: string): string | undefined {
  const schemaDir = getSchemaDir(bpDir);
  if (schemaDir) {
    const filePath = join(schemaDir, 'instructions', `${step}.md`);
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8');
    }
  }
  // Fallback: built-in TypeScript (lazy import to avoid circular deps)
  return undefined; // caller handles fallback via WORKFLOW_REGISTRY
}

/** Resolve an artifact template: custom schema file -> built-in TypeScript */
export function resolveTemplate(bpDir: string, templateType: string): string | undefined {
  const schemaDir = getSchemaDir(bpDir);
  if (schemaDir) {
    const filePath = join(schemaDir, 'templates', `${templateType}.md`);
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8');
    }
  }
  return undefined; // caller handles fallback via ARTIFACT_TEMPLATES
}

/** Resolve an agent prompt: custom schema file -> built-in TypeScript */
export function resolveAgentPrompt(bpDir: string, role: string): string | undefined {
  const schemaDir = getSchemaDir(bpDir);
  if (schemaDir) {
    const filePath = join(schemaDir, 'agents', `${role}.md`);
    if (existsSync(filePath)) {
      return readFileSync(filePath, 'utf-8');
    }
  }
  return undefined; // caller handles fallback via AGENT_PROMPTS
}
