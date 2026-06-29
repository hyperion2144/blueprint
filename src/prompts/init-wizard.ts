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
      message: '选择工作流严格度:',
      options: [{ value: 'lite', label: 'Lite' }, { value: 'standard', label: 'Standard（推荐）' }, { value: 'strict', label: 'Strict' }],
      initialValue: defaults.profile,
    });
    const profile = (typeof val === 'string' ? val : defaults.profile) as Profile;
    const ctxVal = await clack.text({ message: '项目上下文描述（可选）:', placeholder: '技术栈: TypeScript, Node.js...' });
    const context = typeof ctxVal === 'string' ? ctxVal : '';
    const pfVal = await clack.multiselect({ message: '选择目标平台:', options: [{ value: 'omp', label: 'Oh My Pi' }], initialValues: ['omp'] });
    const platform = Array.isArray(pfVal) ? pfVal as string[] : ['omp'];
    const bfVal = await clack.confirm({ message: '这是一个存量项目吗？', initialValue: false });
    const brownfield = typeof bfVal === 'boolean' ? bfVal : false;
    return { profile, context, platform, brownfield };
  } catch {
    console.log('(@clack/prompts 未安装，使用默认配置)');
    return { profile: defaults.profile as Profile, context: '', platform: ['omp'], brownfield: false };
  }
}
