import { z } from 'zod';

const disciplinesArray = z.array(z.enum(['tennis', 'padel'])).min(1).max(2);
const profile = z.enum(['joueur', 'coach', 'ecole', 'decouverte']);

export const quoteLicenceSchema = z.object({
  profile,
  birthDate: z.coerce.date(),
});

// multipart/form-data : les champs non-fichiers arrivent en string, les
// fichiers (cni, photo) sont gérés à part par multer dans la route.
export const payLicenceSchema = z.object({
  profile,
  birthDate: z.coerce.date(),
  birthPlace: z.string().trim().min(2).max(120),
  disciplines: z.string().transform((raw, ctx) => {
    try {
      const parsed = disciplinesArray.parse(JSON.parse(raw));
      return parsed;
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Discipline invalide' });
      return z.NEVER;
    }
  }),
});

export type QuoteLicenceDto = z.infer<typeof quoteLicenceSchema>;
export type PayLicenceDto = z.infer<typeof payLicenceSchema>;
