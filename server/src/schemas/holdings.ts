import { z } from 'zod';

export const HoldingsQuery = z.object({
  symbol: z.string().min(1).max(20).optional(),
});
export type HoldingsQueryInput = z.infer<typeof HoldingsQuery>;
