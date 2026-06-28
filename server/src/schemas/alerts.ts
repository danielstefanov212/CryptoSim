import { z } from 'zod';

export const AlertIdParam = z.object({ id: z.string().min(1) });
export type AlertIdParam = z.infer<typeof AlertIdParam>;

const AmountInput = z
  .union([
    z.string().regex(/^[0-9]+(\.[0-9]+)?$/, 'targetPrice must be a decimal string'),
    z.number().positive().finite(),
  ])
  .transform((v) => (typeof v === 'string' ? v : v.toString()));

export const CreateAlertBody = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, 'symbol must be uppercase'),
  targetPrice: AmountInput,
  direction: z.enum(['ABOVE', 'BELOW']),
});
export type CreateAlertBody = z.infer<typeof CreateAlertBody>;

export const UpdateAlertBody = z.object({
  targetPrice: AmountInput.optional(),
  direction: z.enum(['ABOVE', 'BELOW']).optional(),
  isActive: z.boolean().optional(),
});
export type UpdateAlertBody = z.infer<typeof UpdateAlertBody>;
