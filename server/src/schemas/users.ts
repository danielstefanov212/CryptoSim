import { z } from 'zod';

export const UserIdParam = z.object({
  userId: z.string().min(1),
});
export type UserIdParam = z.infer<typeof UserIdParam>;

export const AdminUpdateUserBody = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    email: z.string().trim().email().toLowerCase().optional(),
    role: z.enum(['TRADER', 'ADMIN']).optional(),
    password: z.string().min(8).max(200).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });
export type AdminUpdateUserBody = z.infer<typeof AdminUpdateUserBody>;
