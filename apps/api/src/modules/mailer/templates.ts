const ACCENT = '#C25D2E';
const INK    = '#1A1814';
const MUTED  = '#6B6357';

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
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:#F3EEE4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#F3EEE4;padding:40px 16px">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px">

      <tr><td style="background:${ACCENT};border-radius:14px 14px 0 0;padding:24px 32px;text-align:center">
        <p style="margin:0;font-size:22px;font-weight:700;color:#fff;letter-spacing:-0.02em">ATC</p>
        <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.65);text-transform:uppercase;letter-spacing:0.08em">Abidjan Tennis Community</p>
      </td></tr>

      <tr><td style="background:#ffffff;padding:36px 32px;border-radius:0 0 14px 14px">
        ${content}
      </td></tr>

      <tr><td style="padding:24px 0;text-align:center">
        <p style="margin:0;font-size:12px;color:${MUTED}">
          Vous recevez cet email car vous êtes membre d'Abidjan Tennis Community.<br>
          © 2026 Abidjan Tennis Community
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ── Blocs réutilisables ───────────────────────────────────────────────────

function h1(text: string): string {
  return `<h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:${INK};letter-spacing:-0.025em;line-height:1.2">${text}</h1>`;
}

function p(text: string): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:${MUTED}">${text}</p>`;
}

function strong(text: string): string {
  return `<strong style="color:${INK}">${text}</strong>`;
}

/**
 * Tableau d'infos. Les libellés sont des littéraux internes ; les valeurs
 * peuvent provenir de l'utilisateur → systématiquement échappées ici.
 */
function infoTable(rows: { label: string; value: string }[]): string {
  const cells = rows.map(r => `
    <tr>
      <td style="padding:10px 16px 10px 0;font-size:13px;color:${MUTED};font-weight:500;white-space:nowrap;border-bottom:1px solid #F0EBE3;vertical-align:top">${r.label}</td>
      <td style="padding:10px 0;font-size:13px;color:${INK};font-weight:600;border-bottom:1px solid #F0EBE3">${esc(r.value)}</td>
    </tr>`).join('');
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0 24px;border-top:1px solid #F0EBE3">${cells}</table>`;
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
  const result = opts.won ? '✅ Victoire' : '❌ Défaite';
  const rows = [
    { label: 'Résultat', value: result },
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
      ${p(`Ce lien est valable <strong style="color:${INK}">30 minutes</strong>.`)}
      <div style="margin:28px 0;text-align:center">
        <a href="${esc(safeUrl)}"
           style="display:inline-block;padding:14px 32px;background:${ACCENT};color:#fff;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">
          Changer mon mot de passe
        </a>
      </div>
      ${p(`Si vous n'avez pas demandé cette réinitialisation, ignorez simplement cet email.`)}
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
      <div style="margin:28px 0;text-align:center">
        <a href="${esc(opts.appUrl)}"
           style="display:inline-block;padding:14px 32px;background:${ACCENT};color:#fff;border-radius:10px;font-size:15px;font-weight:600;text-decoration:none;letter-spacing:-0.01em">
          Ouvrir la conversation
        </a>
      </div>
      ${p(`Activez les notifications dans l'application pour être prévenu directement la prochaine fois.`)}
    `),
  };
}
