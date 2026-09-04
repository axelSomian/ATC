import { log } from './logger.js';

const API_KEY       = process.env.MAILEROO_API_KEY;
const FROM_ADDRESS  = process.env.MAIL_FROM_ADDRESS ?? 'noreply@atc.ci';
const FROM_NAME     = process.env.MAIL_FROM_NAME    ?? 'Abidjan Tennis Community';
const BASE          = 'https://smtp.maileroo.com/api/v2';

if (!API_KEY && process.env.NODE_ENV === 'production') {
  log.error('mailer.disabled', { reason: 'MAILEROO_API_KEY manquant — aucun e-mail ne partira' });
}

export interface EmailAddress {
  address:       string;
  display_name?: string;
}

async function post(path: string, body: unknown): Promise<void> {
  const to = (body as { to: EmailAddress | EmailAddress[] }).to;
  const sub = (body as { subject: string }).subject;

  if (!API_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MAILEROO_API_KEY manquant');
    }
    console.log(`[Mailer] 📧  ${sub} → ${JSON.stringify(to)}`);
    return;
  }

  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body:    JSON.stringify(body),
  });

  const text = await res.text().catch(() => '');
  if (!res.ok) {
    throw new Error(`Maileroo ${res.status}: ${text}`);
  }
  // Trace la réference Maileroo → permet de retrouver l'e-mail dans leur tableau de bord.
  let ref: string | undefined;
  try { ref = (JSON.parse(text) as { data?: { reference_id?: string } }).data?.reference_id; } catch { /* ignore */ }
  log.info('mailer.queued', { to, subject: sub, ref });
}

export function sendEmail(
  to:      EmailAddress | EmailAddress[],
  subject: string,
  html:    string,
  tags?:   Record<string, string>,
): Promise<void> {
  return post('/emails', {
    from: { address: FROM_ADDRESS, display_name: FROM_NAME },
    to,
    subject,
    html,
    tracking: false,
    ...(tags ? { tags } : {}),
  });
}
