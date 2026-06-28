import { z } from 'zod';

export const WatchlistIdParam = z.object({ id: z.string().min(1) });
export type WatchlistIdParam = z.infer<typeof WatchlistIdParam>;

export const CreateWatchlistBody = z.object({
  symbol: z.string().min(1).max(20).regex(/^[A-Z0-9]+$/, 'symbol must be uppercase'),
  notes: z.string().max(500).optional(),
});
export type CreateWatchlistBody = z.infer<typeof CreateWatchlistBody>;

export const UpdateWatchlistBody = z.object({
  notes: z.string().max(500).nullable(),
});
export type UpdateWatchlistBody = z.infer<typeof UpdateWatchlistBody>;
