/**
 * OMP Extension generator — emits the byte-deterministic
 * `.omp/extensions/bp/index.ts` file descriptor. The content is sourced
 * exclusively from `EXTENSION_SOURCE` in `extension-runtime.ts` so the
 * generator has no inline string literal to drift out of sync.
 */

import type { ProjectConfig } from '../../types/index.js';
import { EXTENSION_SOURCE } from './extension-runtime.js';

export const EXTENSION_PATH = '.omp/extensions/bp/index.ts';

/** Return the file descriptor for the OMP Extension source. */
export function generateExtension(_config: ProjectConfig): { path: string; content: string }[] {
  return [{ path: EXTENSION_PATH, content: EXTENSION_SOURCE }];
}
