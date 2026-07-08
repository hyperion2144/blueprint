import type { Profile } from '../types/index.js';
import { SPEC_STACKS } from '../templates/spec-stacks/index.js';

interface WizardOptions {
  profile: Profile;
  context: string;
  platform: string[];
  brownfield: boolean;
  specStack: string;
  releaseTemplate: string;
  commitDocs: boolean;
}

export async function runInitWizard(defaults: { profile: string; yes: boolean }): Promise<WizardOptions> {
  if (defaults.yes) {
    return { profile: defaults.profile as Profile, context: '', platform: ['omp'], brownfield: false, specStack: 'generic', releaseTemplate: 'standard', commitDocs: false };
  }
  try {
    const clack = await import('@clack/prompts');

    // 1. Workflow profile
    const val = await clack.select({
      message: 'Workflow strictness — controls how strictly BP enforces quality gates:',
      options: [
        { value: 'lite', label: 'Lite', hint: 'skip TDD verification for non-behavioral changes' },
        { value: 'standard', label: 'Standard (recommended)', hint: 'TDD enforced, triple review mandatory, plan check enabled' },
        { value: 'strict', label: 'Strict', hint: 'extra validation gates, no auto-advance, all checks required' },
      ],
      initialValue: defaults.profile,
    });
    const profile = (typeof val === 'string' ? val : defaults.profile) as Profile;

    // 2. Project context
    const ctxVal = await clack.text({
      message: 'Project context — brief description of tech stack, domain, constraints:',
      placeholder: 'Tech stack: TypeScript, Node.js, Commander.js. A CLI tool for...',
    });
    const context = typeof ctxVal === 'string' ? ctxVal : '';

    // 3. Platform
    const pfVal = await clack.multiselect({
      message: 'Target platform — which AI agent platform(s) to generate integration files for:',
      options: [
        { value: 'omp', label: 'Oh My Pi', hint: 'generates .omp/commands/, .omp/agents/, and hooks' },
        { value: 'claude-code', label: 'Claude Code', hint: 'generates .claude/commands/ + .claude/agents/' },
        { value: 'agent', label: 'Agent (generic)', hint: 'generates .agent/skills/ + .agent/agents/ with [BP:xxx] params' },
      ],
      initialValues: ['omp'],
    });
    const platform = Array.isArray(pfVal) ? pfVal as string[] : ['omp'];

    // 4. Brownfield
    const bfVal = await clack.confirm({
      message: 'Is this an existing (brownfield) project? — detects existing code and bootstraps specs from it',
      initialValue: false,
    });
    const brownfield = typeof bfVal === 'boolean' ? bfVal : false;

    // 5. Spec stack — skip for brownfield (auto-detected in bp-init)
    let specStack = 'generic';
    if (!brownfield) {
      const stackVal = await clack.select({
        message: 'Tech stack spec template — determines initial spec domains and coding conventions:',
        options: SPEC_STACKS.map((s) => ({
          value: s.id,
          label: s.label,
          hint: s.domains.map((d) => d.name).join(', ') + ' domain(s)',
        })),
        initialValue: 'generic',
      });
      specStack = typeof stackVal === 'string' ? stackVal : 'generic';
    }

    // 6. Release template
    const relVal = await clack.select({
      message: 'PR/release body template — format for auto-generated PR descriptions when shipping:',
      options: [
        { value: 'standard', label: 'Standard (recommended)', hint: 'Summary + Changes list + Verification results' },
        { value: 'detailed', label: 'Detailed', hint: 'Standard + User Stories + Key Decisions + Risks' },
        { value: 'minimal', label: 'Minimal', hint: 'Summary + Changes list only' },
      ],
      initialValue: 'standard',
    });
    const releaseTemplate = typeof relVal === 'string' ? relVal : 'standard';

    // 7. Commit docs
    const cdVal = await clack.confirm({
      message: 'Auto-commit documentation files with code changes? — if yes, spec/design/task docs are committed alongside code',
      initialValue: false,
    });
    const commitDocs = typeof cdVal === 'boolean' ? cdVal : false;

    return { profile, context, platform, brownfield, specStack, releaseTemplate, commitDocs };
  } catch {
    console.log('(@clack/prompts not installed, using default config)');
    return { profile: defaults.profile as Profile, context: '', platform: ['omp'], brownfield: false, specStack: 'generic', releaseTemplate: 'standard', commitDocs: false };
  }
}
