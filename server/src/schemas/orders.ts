import { z } from 'zod';

const AmountInput = z
  .union([
    z.string().regex(/^[0-9]+(\.[0-9]+)?$/, 'amount must be a decimal string'),
    z.number().positive().finite(),
  ])
  .transform((v) => (typeof v === 'string' ? v : v.toString()))
  .refine((s) => Number(s) > 0, 'amount must be positive');

export const OrderBody = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, 'symbol must be uppercase'),
  amount: AmountInput,
});
export type OrderBodyInput = z.infer<typeof OrderBody>;

export const OrdersQuery = z.object({
  symbol: z.string().min(1).max(20).optional(),
});
export type OrdersQueryInput = z.infer<typeof OrdersQuery>;
