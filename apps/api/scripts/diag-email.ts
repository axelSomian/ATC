/**
 * Envoie un exemplaire de chaque e-mail transactionnel à une adresse, pour
 * vérifier le rendu du gabarit (charte ATC).
 *
 *   npx tsx --env-file=.env scripts/diag-email.ts <adresse> [nom-du-modele]
 *
 * Sans 2ᵉ argument : envoie les 9 modèles. Nécessite MAILEROO_API_KEY dans .env.
 */
import { sendEmail } from '../src/lib/mailer.js';
import {
  welcomeTemplate, challengeReceivedTemplate, challengeAcceptedTemplate,
  challengeDeclinedTemplate, scoreToValidateTemplate, scoreConfirmedTemplate,
  scoreDisputedTemplate, passwordResetTemplate, verifyEmailTemplate,
  messageReceivedTemplate,
} from '../src/modules/mailer/templates.js';

const to = process.argv[2];
const only = process.argv[3];
if (!to) {
  console.error('Usage: npx tsx --env-file=.env scripts/diag-email.ts <adresse> [modele]');
  process.exit(1);
}

const when = new Date(Date.now() + 3 * 86_400_000);
const APP = process.env.CORS_ORIGIN ?? 'https://atc-web-ten.vercel.app';

const all: Record<string, { subject: string; html: string }> = {
  welcome: welcomeTemplate('Sarah Koné'),
  'challenge-received': challengeReceivedTemplate({
    challengedName: 'Sarah', challengerName: 'Julie Amani', when,
    court: 'Tennis Club de Cocody', type: 'simple', note: 'On se cale samedi matin ?',
  }),
  'challenge-accepted': challengeAcceptedTemplate({
    challengerName: 'Julie', challengedName: 'Sarah Koné', when,
    court: 'Tennis Club de Cocody', type: 'simple',
  }),
  'challenge-declined': challengeDeclinedTemplate({ challengerName: 'Julie', challengedName: 'Sarah Koné' }),
  'score-to-validate': scoreToValidateTemplate({
    recipientName: 'Sarah', submitterName: 'Julie Amani', court: 'TC Cocody',
    playedAt: when, scoreHost: '6-4 7-5', scoreGuest: '4-6 5-7', isRecipientHost: false,
  }),
  'score-confirmed': scoreConfirmedTemplate({
    submitterName: 'Julie', opponentName: 'Julie Amani', court: 'TC Cocody', playedAt: when, won: true,
  }),
  'score-disputed': scoreDisputedTemplate({
    submitterName: 'Julie', opponentName: 'Julie Amani', court: 'TC Cocody', playedAt: when,
  }),
  'password-reset': passwordResetTemplate({ name: 'Sarah Koné', resetUrl: `${APP}/auth/reset-password?token=demo` }),
  'verify-email': verifyEmailTemplate({ name: 'Sarah Koné', verifyUrl: `${APP}/auth/verify-email?token=demo` }),
  'message-received': messageReceivedTemplate({ recipientName: 'Sarah', senderName: 'Julie Amani', appUrl: `${APP}/messages/demo` }),
};

const entries = only ? Object.entries(all).filter(([k]) => k === only) : Object.entries(all);
if (entries.length === 0) {
  console.error(`Modèle inconnu. Choix : ${Object.keys(all).join(', ')}`);
  process.exit(1);
}

async function run() {
  for (const [name, tpl] of entries) {
    try {
      await sendEmail({ address: to, display_name: 'Test ATC' }, `[TEST ${name}] ${tpl.subject}`, tpl.html, { type: 'diag' });
      console.log(`✓ ${name}  →  ${to}`);
    } catch (err) {
      console.error(`✗ ${name}`, err);
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  console.log('Terminé.');
}
void run();
