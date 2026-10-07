import type { ContactMessage } from './schema';

/**
 * Builds the notification email sent to the site owner. Every visitor-supplied
 * value is HTML-escaped before interpolation (escape first, then add markup).
 */
const SUBJECT_PREFIX = 'Portfolio Contact — ';

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Makes a value safe to place inside a quoted email header display name. */
export function sanitizeHeaderText(value: string): string {
  return value.replace(/[\r\n]+/g, ' ').replace(/["\\]/g, '').trim();
}

export function buildContactEmail(msg: ContactMessage, source: string) {
  const safe = {
    name: escapeHtml(msg.name),
    email: escapeHtml(msg.email),
    subject: escapeHtml(msg.subject),
    message: escapeHtml(msg.message).replace(/\r?\n/g, '<br />'),
  };

  const row = (label: string, value: string) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e6e8eb;vertical-align:top;width:110px;font:600 12px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#6b7480;">${label}</td>
        <td style="padding:14px 0;border-bottom:1px solid #e6e8eb;font:400 15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#12171d;">${value}</td>
      </tr>`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f6f8;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e8eb;border-radius:10px;">
      <tr><td style="padding:26px 28px 6px;"><h1 style="margin:0;font:600 19px/1.3 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#12171d;">New Portfolio Contact</h1></td></tr>
      <tr><td style="padding:0 28px 22px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
${row('Name', safe.name)}
${row('Email', `<a href="mailto:${safe.email}" style="color:#2d7ff9;text-decoration:none;">${safe.email}</a>`)}
${row('Subject', safe.subject)}
${row('Message', safe.message)}
${row('Source', escapeHtml(source))}
        </table>
      </td></tr>
    </table>
  </body>
</html>`;

  const text = [
    'New Portfolio Contact',
    '',
    `Name:\n${msg.name}`,
    '',
    `Email:\n${msg.email}`,
    '',
    `Subject:\n${msg.subject}`,
    '',
    `Message:\n${msg.message}`,
    '',
    `Source:\n${source}`,
    '',
  ].join('\n');

  return { subject: `${SUBJECT_PREFIX}${msg.subject}`, html, text };
}
