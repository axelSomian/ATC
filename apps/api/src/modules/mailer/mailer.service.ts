import { sendEmail } from '../../lib/mailer.js';
import {
  welcomeTemplate,
  challengeReceivedTemplate,
  challengeAcceptedTemplate,
  challengeDeclinedTemplate,
  scoreToValidateTemplate,
  scoreConfirmedTemplate,
  scoreDisputedTemplate,
  passwordResetTemplate,
} from './templates.js';

function fire(to: string, name: string, subject: string, html: string, tag: string): void {
  sendEmail({ address: to, display_name: name }, subject, html, { type: tag }).catch(() => {});
}

export function sendWelcome(to: string, name: string): void {
  const { subject, html } = welcomeTemplate(name);
  fire(to, name, subject, html, 'welcome');
}

export function sendChallengeReceived(opts: {
  to: string;
  challengedName: string;
  challengerName: string;
  when: Date;
  court: string;
  type: string;
  note?: string | null;
}): void {
  const { subject, html } = challengeReceivedTemplate(opts);
  fire(opts.to, opts.challengedName, subject, html, 'challenge_received');
}

export function sendChallengeAccepted(opts: {
  to: string;
  challengerName: string;
  challengedName: string;
  when: Date;
  court: string;
  type: string;
}): void {
  const { subject, html } = challengeAcceptedTemplate(opts);
  fire(opts.to, opts.challengerName, subject, html, 'challenge_accepted');
}

export function sendChallengeDeclined(opts: {
  to: string;
  challengerName: string;
  challengedName: string;
}): void {
  const { subject, html } = challengeDeclinedTemplate(opts);
  fire(opts.to, opts.challengerName, subject, html, 'challenge_declined');
}

export function sendScoreToValidate(opts: {
  to: string;
  recipientName: string;
  submitterName: string;
  court: string;
  playedAt: Date;
  scoreHost: string;
  scoreGuest: string;
  isRecipientHost: boolean;
}): void {
  const { subject, html } = scoreToValidateTemplate(opts);
  fire(opts.to, opts.recipientName, subject, html, 'score_to_validate');
}

export function sendScoreConfirmed(opts: {
  to: string;
  submitterName: string;
  opponentName: string;
  court: string;
  playedAt: Date;
  won: boolean;
}): void {
  const { subject, html } = scoreConfirmedTemplate(opts);
  fire(opts.to, opts.submitterName, subject, html, 'score_confirmed');
}

export function sendScoreDisputed(opts: {
  to: string;
  submitterName: string;
  opponentName: string;
  court: string;
  playedAt: Date;
}): void {
  const { subject, html } = scoreDisputedTemplate(opts);
  fire(opts.to, opts.submitterName, subject, html, 'score_disputed');
}

export function sendPasswordReset(to: string, name: string, resetUrl: string): void {
  const { subject, html } = passwordResetTemplate({ name, resetUrl });
  fire(to, name, subject, html, 'password_reset');
}
