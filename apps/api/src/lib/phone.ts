import { z } from 'zod';

/**
 * Numéro de téléphone ivoirien.
 * Accepte, au choix de l'utilisateur :
 *   - 10 chiffres        -> "0701020304"            (normalisé en +2250701020304)
 *   - indicatif + numéro -> "+225 07 01 02 03 04"   (espaces / points / tirets ignorés)
 * La valeur stockée est toujours au format "+225" + 10 chiffres.
 */
export const phoneField = z
  .string()
  .trim()
  .transform((v) => v.replace(/[\s.\-()]/g, ''))
  .transform((v) => {
    const digits = v.replace(/^\+?225/, '');
    return /^\d{10}$/.test(digits) ? `+225${digits}` : v;
  })
  .refine((v) => /^\+225\d{10}$/.test(v), {
    message: 'Numéro invalide : 10 chiffres (indicatif +225 facultatif)',
  });
