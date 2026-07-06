/**
 * 生成器入口 — dispatches to PlatformProviders via PlatformRegistry.
 *
 * OMP is registered on first import. Additional providers (claude-code, agent)
 * register themselves when their integration module is loaded.
 */

import { PlatformRegistry } from '../core/platform-registry.js';
import type { GeneratedFile } from '../core/platform-registry.js';
import { registerOmpProvider } from '../integrations/omp/index.js';
import { registerClaudeCodeProvider } from '../integrations/claude-code/index.js';

export type { GeneratedFile };

// Register OMP as the default provider on first import.
registerOmpProvider();
// Register claude-code provider (lazy — only used when platform includes 'claude-code')
registerClaudeCodeProvider();
/** Generate all platform files — dispatches per config.platform. */
export function generateAll(config: ProjectConfig): GeneratedFile[] {
  const platforms = config.platform?.length ? config.platform : ['omp'];
  const files: GeneratedFile[] = [];
  for (const id of platforms) {
    const provider = PlatformRegistry.resolve(id);
    files.push(...provider.generate(config));
  }
  return files;
}
