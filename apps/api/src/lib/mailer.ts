const API_KEY       = process.env.MAILEROO_API_KEY;
const FROM_ADDRESS  = process.env.MAIL_FROM_ADDRESS ?? 'noreply@atc.ci';
const FROM_NAME     = process.env.MAIL_FROM_NAME    ?? 'Abidjan Tennis Community';
const BASE          = 'https://smtp.maileroo.com/api/v2';

export interface EmailAddress {
  address:       string;
  display_name?: string;
}

async function post(path: string, body: unknown): Promise<void> {
  if (!API_KEY) {
    if (process.env.NODE_ENV !== 'production') {
      const to = (body as { to: EmailAddress | EmailAddress[] }).to;
      const sub = (body as { subject: string }).subject;
      console.log(`[Mailer] 📧  ${sub} → ${JSON.stringify(to)}`);
    }
    return;
  }

  const res = await fetch(`${BASE}${path}`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Maileroo ${res.status}: ${text}`);
  }
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
