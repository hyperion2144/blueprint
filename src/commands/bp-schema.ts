/**
 * bp schema - manage custom workflow schemas
 *
 * Commands:
 * - bp schema fork <source> <target> - copy built-in schema to bp/schemas/<target>/
 * - bp schema init <name> - create empty schema skeleton
 * - bp schema validate <name> - check schema validity
 * - bp schema list - list available schemas
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import type { Command } from 'commander';
import { stringify, parse } from 'yaml';
import { findBpDir } from './_utils.js';
import { DEFAULT_SCHEMA, loadSchema, type SchemaDef } from '../core/schema.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../templates/workflows/registry.js';
import { ARTIFACT_TEMPLATES, TEMPLATE_IDS } from '../templates/artifacts/index.js';
import { AGENT_PROMPTS } from '../templates/agents/index.js';

export function register(program: Command): void {
  const schema = program
    .command('schema')
    .description('Manage custom workflow schemas');

  schema
    .command('fork <source> <target>')
    .description('Copy a built-in schema to bp/schemas/<target>/ for customization')
    .action(forkHandler);

  schema
    .command('init <name>')
    .description('Create a minimal empty schema skeleton')
    .option('--description <desc>', 'schema description')
    .action(initHandler);

  schema
    .command('validate <name>')
    .description('Check schema validity (syntax, templates, no circular deps)')
    .action(validateHandler);

  schema
    .command('list')
    .description('List available schemas (built-in + custom)')
    .action(listHandler);
}

// ── fork ─────────────────────────────────────────────────────────

function forkHandler(source: string, target: string): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  if (source !== 'spec-driven') {
    console.error(`Source schema "${source}" not found. Only built-in: spec-driven`);
    process.exit(1);
  }

  const targetDir = join(bpDir, 'schemas', target);
  if (existsSync(targetDir)) {
    console.error(`Schema "${target}" already exists at ${targetDir}`);
    process.exit(1);
  }

  console.log(`Forking "${source}" -> "${target}"...`);

  // Create directory structure
  const instructionsDir = join(targetDir, 'instructions');
  const templatesDir = join(targetDir, 'templates');
  const agentsDir = join(targetDir, 'agents');
  mkdirSync(instructionsDir, { recursive: true });
  mkdirSync(templatesDir, { recursive: true });
  mkdirSync(agentsDir, { recursive: true });

  // Export schema.yaml
  const schemaYaml = stringify({
    name: target,
    version: 2,
    description: `Custom schema forked from ${source}`,
    artifacts: DEFAULT_SCHEMA.artifacts.map(a => ({
      ...a,
      template: `${a.id}.md`,
    })),
    steps: DEFAULT_SCHEMA.steps,
    agents: [
      { role: 'planner', description: 'Change Design Specialist', prompt: 'planner.md' },
      { role: 'executor', description: 'Code Implementation Specialist', prompt: 'executor.md' },
      { role: 'reviewer', description: 'Triple Review Specialist', prompt: 'reviewer.md' },
      { role: 'codebase-scanner', description: 'Codebase Scanner', prompt: 'codebase-scanner.md' },
    ],
  });
  writeFileSync(join(targetDir, 'schema.yaml'), schemaYaml, 'utf-8');
  console.log('  ✓ schema.yaml');

  // Export workflow instructions
  for (const step of Object.keys(WORKFLOW_REGISTRY) as WorkflowStep[]) {
    const entry = WORKFLOW_REGISTRY[step];
    const content = entry.command().content;
    writeFileSync(join(instructionsDir, `${step}.md`), content, 'utf-8');
  }
  console.log(`  ✓ instructions/ (${Object.keys(WORKFLOW_REGISTRY).length} files)`);

  // Export artifact templates
  for (const id of TEMPLATE_IDS) {
    const content = ARTIFACT_TEMPLATES[id];
    if (content) {
      writeFileSync(join(templatesDir, `${id}.md`), content, 'utf-8');
    }
  }
  console.log(`  ✓ templates/ (${TEMPLATE_IDS.length} files)`);

  // Export agent prompts
  for (const [role, prompt] of Object.entries(AGENT_PROMPTS)) {
    writeFileSync(join(agentsDir, `${role}.md`), prompt, 'utf-8');
  }
  console.log(`  ✓ agents/ (${Object.keys(AGENT_PROMPTS).length} files)`);

  console.log(`\n✓ Schema "${target}" created at ${targetDir}`);
  console.log(`  Edit files to customize. Then set in bp/config.yaml:`);
  console.log(`  schema: ${target}`);
}

// ── init ─────────────────────────────────────────────────────────

function initHandler(name: string, options: { description?: string }): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  const targetDir = join(bpDir, 'schemas', name);
  if (existsSync(targetDir)) {
    console.error(`Schema "${name}" already exists at ${targetDir}`);
    process.exit(1);
  }

  mkdirSync(join(targetDir, 'instructions'), { recursive: true });
  mkdirSync(join(targetDir, 'templates'), { recursive: true });
  mkdirSync(join(targetDir, 'agents'), { recursive: true });

  const schemaYaml = stringify({
    name,
    version: 2,
    description: options.description || `${name} workflow`,
    artifacts: [
      { id: 'proposal', generates: 'proposal.md', requires: [], command: 'propose', template: 'proposal.md' },
    ],
    steps: [],
    agents: [],
  });
  writeFileSync(join(targetDir, 'schema.yaml'), schemaYaml, 'utf-8');

  // Create placeholder instruction file
  writeFileSync(
    join(targetDir, 'instructions', 'propose.md'),
    '## Input\n\n- **`$ARGUMENTS`** (required): change name\n\n## Steps\n\nCustomize this instruction file.\n',
    'utf-8',
  );

  // Create placeholder template file
  writeFileSync(
    join(targetDir, 'templates', 'proposal.md'),
    '# Proposal: {{name}}\n\nCustomize this template.\n',
    'utf-8',
  );

  console.log(`✓ Empty schema "${name}" created at ${targetDir}`);
  console.log('  Edit schema.yaml to define your workflow.');
}

// ── validate ─────────────────────────────────────────────────────

function validateHandler(name: string): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  const schemaDir = join(bpDir, 'schemas', name);
  if (!existsSync(schemaDir)) {
    console.error(`Schema "${name}" not found at ${schemaDir}`);
    process.exit(1);
  }

  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Load and parse schema.yaml
  const schemaPath = join(schemaDir, 'schema.yaml');
  if (!existsSync(schemaPath)) {
    errors.push('Missing schema.yaml');
    console.error(`✗ ${errors[0]}`);
    process.exit(1);
  }

  let schema: SchemaDef;
  try {
    const content = readFileSync(schemaPath, 'utf-8');
    schema = parse(content) as SchemaDef;
  } catch (e) {
    errors.push(`Failed to parse schema.yaml: ${e instanceof Error ? e.message : String(e)}`);
    console.error(`✗ ${errors[0]}`);
    process.exit(1);
  }

  // 2. Check required fields
  if (!schema.name) errors.push('Missing "name" field');
  if (!schema.artifacts) errors.push('Missing "artifacts" array');
  if (!schema.steps) warnings.push('No "steps" array (no action steps defined)');

  // 3. Check artifact IDs are unique
  const artifactIds = new Set<string>();
  for (const art of schema.artifacts || []) {
    if (!art.id) errors.push('Artifact missing "id"');
    if (artifactIds.has(art.id)) errors.push(`Duplicate artifact id: ${art.id}`);
    artifactIds.add(art.id);
    if (!art.generates) errors.push(`Artifact "${art.id}" missing "generates"`);
    // Check template file exists if specified
    if (art.template) {
      const tplPath = join(schemaDir, 'templates', art.template);
      if (!existsSync(tplPath)) errors.push(`Artifact "${art.id}" template not found: templates/${art.template}`);
    }
    // Check requires reference valid IDs
    for (const req of art.requires || []) {
      if (!artifactIds.has(req) && req !== art.id) {
        // Might reference a future artifact, warn
        warnings.push(`Artifact "${art.id}" requires "${req}" which is defined later (OK if no circular dep)`);
      }
    }
  }

  // 4. Check for circular dependencies
  const visited = new Set<string>();
  const stack = new Set<string>();
  function checkCircular(id: string): boolean {
    if (stack.has(id)) return true;
    if (visited.has(id)) return false;
    visited.add(id);
    stack.add(id);
    const art = (schema.artifacts || []).find(a => a.id === id);
    for (const req of art?.requires || []) {
      if (checkCircular(req)) return true;
    }
    stack.delete(id);
    return false;
  }
  for (const art of schema.artifacts || []) {
    if (checkCircular(art.id)) {
      errors.push(`Circular dependency detected involving artifact "${art.id}"`);
    }
  }

  // 5. Check step references
  for (const step of schema.steps || []) {
    if (!step.id) errors.push('Step missing "id"');
    if (!step.command) errors.push(`Step "${step.id}" missing "command"`);
    if (!step.completion) errors.push(`Step "${step.id}" missing "completion"`);
    for (const req of step.requires || []) {
      if (!artifactIds.has(req)) {
        errors.push(`Step "${step.id}" requires unknown artifact: "${req}"`);
      }
    }
    // Check instruction file exists
    const instrPath = join(schemaDir, 'instructions', `${step.command}.md`);
    if (!existsSync(instrPath)) {
      warnings.push(`Step "${step.id}" instruction not found: instructions/${step.command}.md (will use built-in)`);
    }
  }

  // 6. Check agent prompts
  for (const agent of schema.agents || []) {
    if (agent.prompt) {
      const agentPath = join(schemaDir, 'agents', agent.prompt);
      if (!existsSync(agentPath)) {
        warnings.push(`Agent "${agent.role}" prompt not found: agents/${agent.prompt} (will use built-in)`);
      }
    }
  }

  // Report
  if (errors.length > 0) {
    console.error(`✗ Schema "${name}" has ${errors.length} error(s):`);
    for (const e of errors) console.error(`  ✗ ${e}`);
    process.exit(1);
  }

  console.log(`✓ Schema "${name}" is valid`);
  if (warnings.length > 0) {
    console.log(`  ${warnings.length} warning(s):`);
    for (const w of warnings) console.log(`  ⚠ ${w}`);
  }
}

// ── list ─────────────────────────────────────────────────────────

function listHandler(): void {
  const bpDir = findBpDir();
  if (!bpDir) {
    console.error('Not in a blueprint project. Run "bp init" first.');
    process.exit(1);
  }

  console.log('Available schemas:\n');
  console.log('  Built-in:');
  console.log('    spec-driven (default)');

  const schemasDir = join(bpDir, 'schemas');
  if (existsSync(schemasDir)) {
    const custom = readdirSync(schemasDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    if (custom.length > 0) {
      console.log('\n  Custom:');
      for (const name of custom) {
        const schemaPath = join(schemasDir, name, 'schema.yaml');
        let desc = '';
        if (existsSync(schemaPath)) {
          try {
            const s = parse(readFileSync(schemaPath, 'utf-8'));
            desc = s.description ? ` - ${s.description}` : '';
          } catch { /* ignore */ }
        }
        console.log(`    ${name}${desc}`);
      }
    }
  }

  // Show current
  try {
    const configPath = join(bpDir, 'config.yaml');
    if (existsSync(configPath)) {
      const config = parse(readFileSync(configPath, 'utf-8'));
      console.log(`\n  Current: ${config?.schema || 'spec-driven'}`);
    }
  } catch { /* ignore */ }
}
