import { z } from 'zod';

export const signupSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email('Email invalide'),
  phone: z
    .string()
    .regex(/^\+225\d{10}$/, 'Format: +225XXXXXXXXXX')
    .optional(),
  password: z.string().min(8, 'Minimum 8 caractères'),
  level: z.number().int().min(1).max(5),
  city: z.string().optional(),
  clubId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  phone: z
    .string()
    .regex(/^\+225\d{10}$/)
    .optional()
    .nullable(),
  bio: z.string().max(500).optional().nullable(),
  age: z.number().int().min(10).max(100).optional().nullable(),
  city: z.string().optional().nullable(),
  clubId: z.string().optional().nullable(),
  racquet: z.string().optional().nullable(),
  preferredCourts: z.array(z.string()).optional(),
  preferredTimes: z.array(z.string()).optional(),
  level: z.number().int().min(1).max(5).optional(),
});

export type SignupDto = z.infer<typeof signupSchema>;
export type LoginDto = z.infer<typeof loginSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
