/**
 * Version courante des CGU + politique de confidentialité.
 * Bumper cette valeur à chaque modification substantielle des textes
 * (`apps/web/.../features/legal/`) → tous les membres devront ré-accepter
 * au prochain accès.
 *
 * Format : date ISO de la version.
 */
export const LEGAL_VERSION = '2026-09-04';

/** true si l'utilisateur a accepté la version courante des textes. */
export function hasAcceptedTerms(u: { termsVersion: string | null }): boolean {
  return u.termsVersion === LEGAL_VERSION;
}
