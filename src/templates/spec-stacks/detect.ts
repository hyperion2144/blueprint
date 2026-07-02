/**
 * Auto-detect the best matching spec stack template from project info.
 */

import type { ProjectInfo } from '../../core/brownfield.js';
import { SPEC_STACKS, type SpecStackTemplate } from './index.js';

/** Returns the first stack whose detect() matches, falling back to 'generic'. */
export function detectSpecStack(info: ProjectInfo): SpecStackTemplate {
  for (const stack of SPEC_STACKS) {
    if (stack.detect(info)) {
      return stack;
    }
  }
  // Fallback: find the generic template
  const generic = SPEC_STACKS.find((s) => s.id === 'generic');
  if (!generic) {
    throw new Error('Generic spec stack template not found — this is a bug');
  }
  return generic;
}

/** Get a stack template by id. */
export function getSpecStack(id: string): SpecStackTemplate {
  const stack = SPEC_STACKS.find((s) => s.id === id);
  if (!stack) {
    // Fallback to generic
    const generic = SPEC_STACKS.find((s) => s.id === 'generic');
    if (!generic) {
      throw new Error(`Spec stack "${id}" not found and generic fallback missing`);
    }
    return generic;
  }
  return stack;
}
