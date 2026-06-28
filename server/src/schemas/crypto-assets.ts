import { z } from 'zod';

export const AssetIdParam = z.object({
  id: z.string().min(1),
});
export type AssetIdParam = z.infer<typeof AssetIdParam>;

export const CreateAssetBody = z.object({
  symbol: z.string().trim().toUpperCase().min(1).max(20),
  name: z.string().trim().min(1).max(120),
  krakenPair: z.string().trim().min(1).max(20),
  krakenRestPair: z.string().trim().min(1).max(20),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().url().optional(),
  displayOrder: z.number().int().min(0).optional(),
});
export type CreateAssetBody = z.infer<typeof CreateAssetBody>;

export const UpdateAssetBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    krakenPair: z.string().trim().min(1).max(20).optional(),
    krakenRestPair: z.string().trim().min(1).max(20).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    displayOrder: z.number().int().min(0).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateAssetBody = z.infer<typeof UpdateAssetBody>;
