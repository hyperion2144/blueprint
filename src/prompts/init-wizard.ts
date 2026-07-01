import type { Profile } from '../types/index.js';

interface WizardOptions {
  profile: Profile;
  context: string;
  platform: string[];
  brownfield: boolean;
}

export async function runInitWizard(defaults: { profile: string; yes: boolean }): Promise<WizardOptions> {
  if (defaults.yes) {
    return { profile: defaults.profile as Profile, context: '', platform: ['omp'], brownfield: false };
  }
  try {
    const clack = await import('@clack/prompts');
    const val = await clack.select({
      message: 'Select workflow strictness:',
      options: [{ value: 'lite', label: 'Lite' }, { value: 'standard', label: 'Standard (recommended)' }, { value: 'strict', label: 'Strict' }],
      initialValue: defaults.profile,
    });
    const profile = (typeof val === 'string' ? val : defaults.profile) as Profile;
    const ctxVal = await clack.text({ message: 'Project context (optional):', placeholder: 'Tech stack: TypeScript, Node.js...' });
    const context = typeof ctxVal === 'string' ? ctxVal : '';
    const pfVal = await clack.multiselect({ message: 'Select target platform:', options: [{ value: 'omp', label: 'Oh My Pi' }], initialValues: ['omp'] });
    const platform = Array.isArray(pfVal) ? pfVal as string[] : ['omp'];
    const bfVal = await clack.confirm({ message: 'Is this an existing (brownfield) project?', initialValue: false });
    const brownfield = typeof bfVal === 'boolean' ? bfVal : false;
    return { profile, context, platform, brownfield };
  } catch {
    console.log('(@clack/prompts not installed, using default config)');
    return { profile: defaults.profile as Profile, context: '', platform: ['omp'], brownfield: false };
  }
}
