import { z } from 'zod';

export const ReportIdParam = z.object({ id: z.string().min(1) });
export type ReportIdParam = z.infer<typeof ReportIdParam>;

const Symbol = z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, 'symbol must be uppercase');

const RollingDays = z.number().int().positive().max(3650);

const baseShape = {
  name: z.string().min(1).max(120),
  symbols: z.array(Symbol).max(20).default([]),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  rollingDays: RollingDays.nullable().optional(),
};

function validateRange<
  T extends {
    startDate?: string | null;
    endDate?: string | null;
    rollingDays?: number | null;
  },
>(v: T, ctx: z.RefinementCtx): void {
  const hasStart = v.startDate !== undefined && v.startDate !== null;
  const hasRolling = v.rollingDays !== undefined && v.rollingDays !== null;
  if (hasStart && hasRolling) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Provide either startDate (fixed window) or rollingDays (rolling window), not both',
      path: ['rollingDays'],
    });
    return;
  }
  if (!hasStart && !hasRolling) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'One of startDate or rollingDays is required',
      path: ['startDate'],
    });
    return;
  }
  if (hasStart && v.endDate) {
    const startMs = new Date(v.startDate as string).getTime();
    const endMs = new Date(v.endDate).getTime();
    if (!(startMs < endMs)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endDate must be strictly after startDate',
        path: ['endDate'],
      });
    }
  }
}

export const CreateReportBody = z.object(baseShape).superRefine(validateRange);
export type CreateReportBody = z.infer<typeof CreateReportBody>;

const updateShape = {
  name: z.string().min(1).max(120).optional(),
  symbols: z.array(Symbol).max(20).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  rollingDays: RollingDays.nullable().optional(),
};

export const UpdateReportBody = z.object(updateShape).superRefine((v, ctx) => {
  if (v.startDate && v.endDate) {
    const startMs = new Date(v.startDate).getTime();
    const endMs = new Date(v.endDate).getTime();
    if (!(startMs < endMs)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'endDate must be strictly after startDate',
        path: ['endDate'],
      });
    }
  }
});
export type UpdateReportBody = z.infer<typeof UpdateReportBody>;
