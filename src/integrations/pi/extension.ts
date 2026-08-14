/**
 * Pi Extension generator — emits the byte-deterministic
 * `.pi/extensions/bp/index.ts` file descriptor. The content is sourced
 * exclusively from `EXTENSION_SOURCE` (re-exported via `extension-runtime.ts`)
 * so the generator has no inline string literal to drift out of sync.
 */

import type { ProjectConfig } from '../../types/index.js';
import { EXTENSION_SOURCE } from './extension-runtime.js';

export const PI_EXTENSION_PATH = '.pi/extensions/bp/index.ts';

/** Return the file descriptor for the bp Pi Extension source. */
export function generatePiExtension(_config: ProjectConfig): { path: string; content: string }[] {
  return [{ path: PI_EXTENSION_PATH, content: EXTENSION_SOURCE }];
}
