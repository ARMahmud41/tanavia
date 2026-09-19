import { z } from 'zod';

export const LoginSchema = z.object({
  email: z.string().email('Valid email din'),
  password: z.string().min(8, 'Kompokkhe 8 okkhor'),
});

export const RegisterSchema = z.object({
  name: z.string().min(3).max(100),
  email: z.string().email(),
  phone: z.string().regex(/^01[3-9]\d{8}$/, 'Sothik mobile number din'),
  password: z
    .string()
    .min(10, 'Kompokkhe 10 okkhor')
    .regex(/[A-Z]/, 'Ekta boro hater okkhor lagbe')
    .regex(/[0-9]/, 'Ekta shongkha lagbe'),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;