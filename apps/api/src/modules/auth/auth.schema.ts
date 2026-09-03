import { z } from 'zod';
import { phoneField } from '../../lib/phone.js';

export const signupSchema = z.object({
  name: z.string().min(2).max(50),
  email: z.string().email('Email invalide'),
  phone: phoneField.optional(),
  password: z.string().min(8, 'Minimum 8 caractères'),
  level: z.number().int().min(1).max(5),
  city: z.string().optional(),
  clubId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/** Jeton d'identité (ID token JWT) renvoyé par Google Identity Services. */
export const googleAuthSchema = z.object({
  credential: z.string().min(20, 'Jeton Google manquant'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: z.string().min(8, 'Minimum 8 caractères'),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  phone: phoneField.optional().nullable(),
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
export type GoogleAuthDto = z.infer<typeof googleAuthSchema>;
export type UpdateProfileDto = z.infer<typeof updateProfileSchema>;
export type ForgotPasswordDto = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordDto = z.infer<typeof resetPasswordSchema>;
