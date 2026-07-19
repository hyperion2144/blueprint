/**
 * OMP legacy-shim generator — emits the 5-line
 * `.omp/hooks/pre/bp.ts` file descriptor that re-exports the Extension
 * default. Content is sourced from `SHIM_SOURCE` in `extension-runtime.ts`.
 */

import type { ProjectConfig } from '../../types/index.js';
import { SHIM_SOURCE } from './extension-runtime.js';

export const LEGACY_SHIM_PATH = '.omp/hooks/pre/bp.ts';

/** Return the file descriptor for the OMP legacy hook shim. */
export function generateLegacyShim(_config: ProjectConfig): { path: string; content: string }[] {
  return [{ path: LEGACY_SHIM_PATH, content: SHIM_SOURCE }];
}
