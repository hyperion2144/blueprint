import { z } from 'zod';

const CONTEXT_PHASES = ['plan', 'apply', 'review', 'archive', 'all'] as const;
const CONTEXT_READ_MODES = ['full', 'range'] as const;

/** A single repository-relative reference in a change's context.jsonl artifact. */
export const ContextRefRowSchema = z
  .object({
    file: z
      .string()
      .min(1, 'file is required')
      .refine((value) => !value.startsWith('/') && !value.split('/').includes('..'), {
        message: 'file must be a repository-relative path',
      }),
    reason: z.string().min(1, 'reason is required').max(200, 'reason must be at most 200 characters'),
    phase: z.enum(CONTEXT_PHASES).default('all'),
    tag: z.string().optional(),
    read: z.enum(CONTEXT_READ_MODES).default('full'),
    range: z
      .tuple([z.number().int().positive(), z.number().int().positive()])
      .optional(),
  })
  .superRefine((row, ctx) => {
    if (row.read === 'range' && !row.range) {
      ctx.addIssue({ code: 'custom', path: ['range'], message: 'range is required when read is range' });
    }
    if (row.read === 'full' && row.range) {
      ctx.addIssue({ code: 'custom', path: ['range'], message: 'range is only allowed when read is range' });
    }
    if (row.range && row.range[0] > row.range[1]) {
      ctx.addIssue({ code: 'custom', path: ['range'], message: 'range start must not exceed range end' });
    }
  });

export type ContextRefRow = z.infer<typeof ContextRefRowSchema>;

export type ContextJsonlErrorCode =
  | 'PARSE_ERROR'
  | 'SCHEMA_ERROR'
  | 'PATH_UNRESOLVED'
  | 'RANGE_OOB';

export interface ContextJsonlError {
  line: number;
  code: ContextJsonlErrorCode;
  message: string;
}
