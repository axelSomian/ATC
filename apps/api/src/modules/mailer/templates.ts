// Charte ATC « premium tennis lifestyle » (source : apps/web/src/styles.css :root).
const GREEN  = '#1F5A45'; // ATC Green — actions, liens, filet de marque
const FOREST = '#163F32'; // Deep Forest — bandeau d'en-tête (surface sombre)
const SAGE   = '#8FAE9B'; // accent lisible sur fond sombre
const INK    = '#1C1C1A'; // texte principal (Soft Black)
const MUTED  = '#6B6559'; // texte secondaire
const CANVAS = '#F1EBDF'; // fond de l'e-mail
const CARD   = '#F8F6F1'; // carte (Soft White — jamais de #fff en surface)
const LINE   = '#E7E0D2'; // filets / séparateurs
const PANEL  = '#EDE5D8'; // Warm Ivory — encart d'infos

// ── Sécurité ──────────────────────────────────────────────────────────────

/**
 * Échappe les caractères HTML. À appliquer à TOUTE valeur d'origine utilisateur
 * (nom, court, note, score…) avant interpolation dans le HTML d'un e-mail —
 * sinon un membre peut injecter du markup (liens de phishing, faux boutons,
 * pixels de tracking) dans un e-mail reçu par un autre membre.
 */
function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Nettoie une valeur destinée au sujet (pas de retour à la ligne / contrôle). */
function subj(value: unknown): string {
  return String(value ?? '').replace(/[\r\n\t\f\v]+/g, ' ').trim();
}

// ── Layout de base ────────────────────────────────────────────────────────

function base(title: string, content: string): string {
  const font = "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif";
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${CANVAS};font-family:${font}">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:${CANVAS};padding:40px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px">

      <tr><td style="background:${FOREST};border-radius:16px 16px 0 0;padding:30px 32px;text-align:center">
        <p style="margin:0;font-size:19px;font-weight:700;color:${CARD};letter-spacing:0.16em">ATC</p>
        <p style="margin:7px 0 0;font-size:10px;color:${SAGE};text-transform:uppercase;letter-spacing:0.2em">Abidjan Tennis Community</p>
      </td></tr>

      <tr><td style="background:${CARD};padding:36px 32px;border-top:3px solid ${GREEN};border-radius:0 0 16px 16px">
        ${content}
      </td></tr>

      <tr><td style="padding:24px 16px 4px;text-align:center">
        <p style="margin:0;font-size:11px;line-height:1.7;color:${MUTED}">
          Vous recevez cet e-mail en tant que membre d'Abidjan Tennis Community.<br>
          © 2026 Abidjan Tennis Community — Abidjan, Côte d'Ivoire
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

/** Bouton d'action principal — ATC Green, sur la carte claire. */
function button(label: string, url: string): string {
  return `<div style="margin:28px 0;text-align:center">
    <a href="${esc(url)}" style="display:inline-block;padding:13px 32px;background:${GREEN};color:${CARD};border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">${esc(label)}</a>
  </div>`;
}

// ── Blocs réutilisables ───────────────────────────────────────────────────

function h1(text: string): string {
  return `<h1 style="margin:0 0 14px;font-size:21px;font-weight:700;color:${INK};letter-spacing:-0.02em;line-height:1.25">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${MUTED}">${text}</p>`;
}

function strong(text: string): string {
  return `<strong style="color:${INK};font-weight:600">${text}</strong>`;
}

/**
 * Tableau d'infos. Les libellés sont des littéraux internes ; les valeurs
 * peuvent provenir de l'utilisateur → systématiquement échappées ici.
 */
function infoTable(rows: { label: string; value: string; accent?: string }[]): string {
  const last = rows.length - 1;
  const cells = rows.map((r, i) => {
    const border = i === last ? 'none' : `1px solid ${LINE}`;
    return `
    <tr>
      <td style="padding:11px 16px 11px 0;font-size:13px;color:${MUTED};font-weight:500;white-space:nowrap;border-bottom:${border};vertical-align:top">${r.label}</td>
      <td style="padding:11px 0;font-size:13px;color:${r.accent ?? INK};font-weight:600;border-bottom:${border}">${esc(r.value)}</td>
    </tr>`;
  }).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:22px 0 26px;background:${PANEL};border-radius:12px;padding:4px 18px">${cells}</table>`;
}

// ── Helpers ───────────────────────────────────────────────────────────────

function fmtDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtDateShort(date: Date): string {
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

function typeLabel(t: string): string {
  return ({ simple: 'Simple', double: 'Double', mixte: 'Mixte' }[t] ?? 'Match');
}

// ── Templates ─────────────────────────────────────────────────────────────

export function welcomeTemplate(name: string): { subject: string; html: string } {
  return {
    subject: subj(`Bienvenue sur ATC, ${name} 🎾`),
    html: base('Bienvenue', `
      ${h1(`Bienvenue, ${esc(name)} !`)}
      ${p(`Votre compte sur la plateforme d'${strong('Abidjan Tennis Community')} est créé.`)}
      ${p('Vous pouvez dès maintenant consulter les profils des membres, publier vos annonces de match et organiser des rencontres.')}
      ${p('Complétez votre profil pour apparaître dans l\'annuaire et trouver des adversaires à votre niveau.')}
    `),
  };
}

export function challengeReceivedTemplate(opts: {
  challengedName: string;
  challengerName: string;
  when: Date;
  court: string;
  type: string;
  note?: string | null;
}): { subject: string; html: string } {
  const rows = [
    { label: 'Date',   value: fmtDate(opts.when) },
    { label: 'Court',  value: opts.court },
    { label: 'Format', value: typeLabel(opts.type) },
    ...(opts.note ? [{ label: 'Note', value: opts.note }] : []),
  ];
  return {
    subject: subj(`${opts.challengerName} vous défie en match 🎾`),
    html: base('Défi reçu', `
      ${h1('Vous avez reçu un défi !')}
      ${p(`${strong(esc(opts.challengerName))} vous a envoyé un défi de match. Connectez-vous pour accepter ou décliner.`)}
      ${infoTable(rows)}
    `),
  };
}

export function challengeAcceptedTemplate(opts: {
  challengerName: string;
  challengedName: string;
  when: Date;
  court: string;
  type: string;
}): { subject: string; html: string } {
  const rows = [
    { label: 'Date',   value: fmtDate(opts.when) },
    { label: 'Court',  value: opts.court },
    { label: 'Format', value: typeLabel(opts.type) },
  ];
  return {
    subject: subj(`${opts.challengedName} a accepté votre défi 🎾`),
    html: base('Défi accepté', `
      ${h1('Défi accepté !')}
      ${p(`${strong(esc(opts.challengedName))} a accepté votre défi. Rendez-vous sur le court !`)}
      ${infoTable(rows)}
    `),
  };
}

export function challengeDeclinedTemplate(opts: {
  challengerName: string;
  challengedName: string;
}): { subject: string; html: string } {
  return {
    subject: subj(`${opts.challengedName} a décliné votre défi`),
    html: base('Défi décliné', `
      ${h1('Défi décliné')}
      ${p(`${strong(esc(opts.challengedName))} n'est pas disponible pour ce match. Essayez un autre créneau ou défiez un autre joueur.`)}
    `),
  };
}

export function scoreToValidateTemplate(opts: {
  recipientName: string;
  submitterName: string;
  court: string;
  playedAt: Date;
  scoreHost: string;
  scoreGuest: string;
  isRecipientHost: boolean;
}): { subject: string; html: string } {
  const myScore  = opts.isRecipientHost ? opts.scoreHost  : opts.scoreGuest;
  const oppScore = opts.isRecipientHost ? opts.scoreGuest : opts.scoreHost;
  const rows = [
    { label: 'Soumis par',          value: opts.submitterName },
    { label: 'Court',               value: opts.court },
    { label: 'Date',                value: fmtDate(opts.playedAt) },
    { label: 'Votre score',         value: myScore },
    { label: 'Score adversaire',    value: oppScore },
  ];
  return {
    subject: subj(`Score à valider — match du ${fmtDateShort(opts.playedAt)}`),
    html: base('Score à valider', `
      ${h1('Un score attend votre validation')}
      ${p(`${strong(esc(opts.submitterName))} a enregistré le score de votre match. Connectez-vous pour ${strong('confirmer ou contester')}.`)}
      ${infoTable(rows)}
    `),
  };
}

export function scoreConfirmedTemplate(opts: {
  submitterName: string;
  opponentName: string;
  court: string;
  playedAt: Date;
  won: boolean;
}): { subject: string; html: string } {
  const rows = [
    { label: 'Résultat', value: opts.won ? 'Victoire' : 'Défaite', accent: opts.won ? '#2F6B4F' : '#B23B2E' },
    { label: 'Contre',   value: opts.opponentName },
    { label: 'Court',    value: opts.court },
    { label: 'Date',     value: fmtDate(opts.playedAt) },
  ];
  return {
    subject: subj(`Score confirmé — ${opts.won ? 'Victoire' : 'Défaite'} vs ${opts.opponentName}`),
    html: base('Score confirmé', `
      ${h1('Score confirmé')}
      ${p(`${strong(esc(opts.opponentName))} a validé le score. Votre classement a été mis à jour.`)}
      ${infoTable(rows)}
    `),
  };
}

export function scoreDisputedTemplate(opts: {
  submitterName: string;
  opponentName: string;
  court: string;
  playedAt: Date;
}): { subject: string; html: string } {
  return {
    subject: subj(`Score contesté — match du ${fmtDateShort(opts.playedAt)}`),
    html: base('Score contesté', `
      ${h1('Score contesté')}
      ${p(`${strong(esc(opts.opponentName))} a contesté le score du match du ${strong(fmtDate(opts.playedAt))} à ${esc(opts.court)}.`)}
      ${p('Un administrateur examinera le litige. Vous serez notifié de la décision.')}
    `),
  };
}

export function passwordResetTemplate(opts: {
  name: string;
  resetUrl: string;
}): { subject: string; html: string } {
  const safeUrl = encodeURI(opts.resetUrl);
  return {
    subject: 'Réinitialisation de votre mot de passe ATC',
    html: base('Mot de passe oublié', `
      ${h1('Réinitialisez votre mot de passe')}
      ${p(`Bonjour ${strong(esc(opts.name))}, vous avez demandé à réinitialiser votre mot de passe.`)}
      ${p(`Ce lien est valable <strong style="color:${INK};font-weight:600">30 minutes</strong>.`)}
      ${button('Changer mon mot de passe', safeUrl)}
      ${p(`Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet e-mail.`)}
    `),
  };
}

export function verifyEmailTemplate(opts: {
  name: string;
  verifyUrl: string;
}): { subject: string; html: string } {
  const safeUrl = encodeURI(opts.verifyUrl);
  return {
    subject: 'Confirmez votre adresse e-mail — ATC',
    html: base('Confirmez votre adresse', `
      ${h1(`Bienvenue, ${esc(opts.name)} !`)}
      ${p(`Votre compte sur la plateforme d'${strong('Abidjan Tennis Community')} est créé. Confirmez votre adresse e-mail pour recevoir les notifications de match et sécuriser votre compte.`)}
      ${button('Confirmer mon adresse', safeUrl)}
      ${p(`Ce lien est valable <strong style="color:${INK};font-weight:600">24 heures</strong>. Sans confirmation, la publication d'annonces sera limitée au bout de 7 jours.`)}
      ${p(`Si vous n'êtes pas à l'origine de cette inscription, ignorez cet e-mail.`)}
    `),
  };
}

export function messageReceivedTemplate(opts: {
  recipientName: string;
  senderName: string;
  appUrl: string;
}): { subject: string; html: string } {
  return {
    subject: subj(`Nouveau message de ${opts.senderName}`),
    html: base('Nouveau message', `
      ${h1('Vous avez un nouveau message')}
      ${p(`Bonjour ${strong(esc(opts.recipientName))}, ${strong(esc(opts.senderName))} vous a écrit pour organiser votre match.`)}
      ${button('Ouvrir la conversation', encodeURI(opts.appUrl))}
      ${p(`Activez les notifications dans l'application pour être prévenu directement la prochaine fois.`)}
    `),
  };
}
