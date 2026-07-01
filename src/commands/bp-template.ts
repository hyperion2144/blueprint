/**
 * bp template <type> — generate artifact from TypeScript template registry
 *
 * Templates are imported from src/templates/artifacts/index.ts — no disk reads.
 */

import { join, dirname } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { ARTIFACT_TEMPLATES, TEMPLATE_IDS } from '../templates/artifacts/index.js';
import { WORKFLOW_REGISTRY, type WorkflowStep } from '../templates/workflows/registry.js';
import { STEP_TO_WORKFLOW } from '../core/continue.js';

export function register(program: any): void {
  program
    .command('template <type>')
    .description(`Generate template file (${TEMPLATE_IDS.join('|')})`)
    .option('--name <name>', 'change name (required when writing to changes/)')
    .option('--dir <path>', 'target directory')
    .option('--stdout', 'print template to stdout instead of writing to file')
    .action(templateHandler);
}

function templateHandler(type: string, options: { name?: string; dir?: string; stdout?: boolean }) {
  // 1. Try artifact template
  let template = ARTIFACT_TEMPLATES[type];
  if (template) {
    const name = options.name || 'unknown';
    const date = new Date().toISOString().slice(0, 10);
    let content = template;
    content = content.replace(/\{\{name\}\}/g, name);
    content = content.replace(/\{\{date\}\}/g, date);

    if (options.stdout) {
      console.log(content);
      return;
    }

    let targetDir: string;
    if (options.dir) {
      targetDir = options.dir.startsWith('/') ? options.dir : join(process.cwd(), options.dir);
    } else if (options.name) {
      targetDir = join(process.cwd(), 'bp', 'changes', options.name);
    } else {
      console.log(content);
      return;
    }

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
      'codebase-structure': 'codebase/structure.md',
      'codebase-conventions': 'codebase/conventions.md',
      'codebase-testing': 'codebase/testing.md',
      'codebase-integrations': 'codebase/integrations.md',
      'codebase-concerns': 'codebase/concerns.md',
      'codebase-pitfalls': 'codebase/concerns.md',
      'spec': 'spec.md',
      'completion': 'completion.md',
      'requirements': 'requirements.md',
      'roadmap': 'roadmap.md',
      'research-stack': 'research/stack.md',
      'research-architecture': 'research/architecture.md',
      'research-pitfalls': 'research/pitfalls.md',
      'phase-research': 'phase-research.md',
    };
    const filename = filenames[type] ?? `${type}.md`;

    mkdirSync(targetDir, { recursive: true });
    const fullPath = join(targetDir, filename);
    const fullDir = dirname(fullPath);
    if (fullDir !== targetDir) {
      mkdirSync(fullDir, { recursive: true });
    }
    writeFileSync(fullPath, content, 'utf-8');
    console.log(`✓ Created ${fullPath}`);
    return;
  }

  // 2. Try workflow step template (e.g. bp template grill, bp template discuss)
  const wfStep = (STEP_TO_WORKFLOW as Record<string, WorkflowStep>)[type];
  if (wfStep && WORKFLOW_REGISTRY[wfStep]) {
    const cmd = WORKFLOW_REGISTRY[wfStep].command();
    console.log(cmd.content);
    return;
  }

  console.error(`Unknown template type: ${type}. Available: ${TEMPLATE_IDS.join(', ')}`);
  process.exit(1);
}
