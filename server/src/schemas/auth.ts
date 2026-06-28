import { z } from 'zod';

export const RegisterBody = z
  .object({
    name: z.string().trim().min(1, 'Name is required').max(120),
    email: z.string().trim().email().toLowerCase(),
    password: z.string().min(8, 'Password must be at least 8 characters').max(200),
    repeatPassword: z.string(),
  })
  .refine((d) => d.password === d.repeatPassword, {
    message: 'Passwords do not match',
    path: ['repeatPassword'],
  });

export type RegisterBody = z.infer<typeof RegisterBody>;

export const LoginBody = z.object({
  email: z.string().trim().email().toLowerCase(),
  password: z.string().min(1),
});

export type LoginBody = z.infer<typeof LoginBody>;
