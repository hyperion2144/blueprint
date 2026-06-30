/**
 * specwf template <type> — generate artifact from TypeScript template registry
 *
 * Templates are imported from src/templates/artifacts/index.ts — no disk reads.
 */

import { join, dirname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ARTIFACT_TEMPLATES, TEMPLATE_IDS } from '../templates/artifacts/index.js';

export function register(program: any): void {
  program
    .command('template <type>')
    .description(`Generate template file (${TEMPLATE_IDS.join('|')})`)
    .option('--name <name>', 'change name', 'my-change')
    .option('--dir <path>', 'target directory (default specwf/changes/<name>/)')
    .action(templateHandler);
}

function templateHandler(type: string, options: { name: string; dir?: string }) {
  const template = ARTIFACT_TEMPLATES[type];
  if (!template) {
    console.error(`Unknown template type: ${type}. Available: ${TEMPLATE_IDS.join(', ')}`);
    process.exit(1);
  }

  let content = template;
  const name = options.name;
  const date = new Date().toISOString().slice(0, 10);

  // Replace placeholders
  content = content.replace(/\{\{name\}\}/g, name);
  content = content.replace(/\{\{date\}\}/g, date);

  // Determine target directory and filename
  const filenames: Record<string, string> = {
    proposal: 'proposal.md',
    design: 'design.md',
    tasks: 'tasks.md',
    context: 'context.md',
    research: 'research.md',
    summary: 'summary.md',
    verification: 'verification.md',
    'spec-review': 'spec-review.md',
    'quality-review': 'quality-review.md',
    'goal-review': 'goal-review.md',
    'change-summary': 'change-summary.md',
    'codebase-stack': 'codebase/stack.md',
    'codebase-architecture': 'codebase/architecture.md',
    'codebase-conventions': 'codebase/conventions.md',
    'codebase-pitfalls': 'codebase/pitfalls.md',
    'phase-research': 'phase-research.md',
  };

  const filename = filenames[type] ?? `${type}.md`;
  let targetDir: string;

  if (options.dir) {
    targetDir = options.dir.startsWith('/') ? options.dir : join(process.cwd(), options.dir);
  } else {
    targetDir = join(process.cwd(), 'specwf', 'changes', name);
  }

  mkdirSync(targetDir, { recursive: true });
  const fullPath = join(targetDir, filename);
  // Handle nested filenames (e.g. codebase/stack.md)
  const fullDir = dirname(fullPath);
  if (fullDir !== targetDir) {
    mkdirSync(fullDir, { recursive: true });
  }
  writeFileSync(fullPath, content, 'utf-8');

  console.log(`✓ Created ${fullPath}`);
}
