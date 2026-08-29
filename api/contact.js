// Vercel Function — POST /api/contact (publicly routed as POST api.alexball.dev/contact)
// Validates a portfolio contact-form submission and sends a notification email via Resend.
// RESEND_API_KEY is read from process.env only — never forwarded to the client.

import { Resend } from 'resend';

const DEFAULT_ALLOWED_ORIGINS = ['https://alexball.dev', 'https://www.alexball.dev', 'http://localhost:5173'];

// Field caps. `email` is 254 because that is the maximum length of an address
// permitted by RFC 5321; the rest are product limits, generous for real messages
// but small enough to keep a hostile payload cheap to reject.
const MAX = { name: 100, email: 254, subject: 150, message: 5000 };

// Prefixing the visitor's subject (rather than using it raw) makes portfolio mail
// instantly identifiable in an inbox that also receives forwarded personal mail.
const SUBJECT_PREFIX = 'Portfolio Contact — ';
// Sender and recipient are intentionally the same mailbox: notifications are
// addressed from the site to itself, and Reply-To carries the visitor.
const FROM_NAME = 'alexball.dev Contact Form';
const DEFAULT_FROM_EMAIL = 'contact@alexball.dev';
const DEFAULT_TO_EMAIL = 'contact@alexball.dev';

// Same shape the contact form applies client-side — deliberately permissive.
// Real deliverability is proven by a reply, not by a stricter regex.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Bots fill every input they find. A visitor never sees this one, so any value
// means the submission was automated.
const HONEYPOT_FIELD = 'company';

function getAllowedOrigins() {
  const raw = process.env.ALLOWED_ORIGIN;
  if (!raw) return DEFAULT_ALLOWED_ORIGINS;
  const list = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return list.length ? list : DEFAULT_ALLOWED_ORIGINS;
}

function applyCors(req, res) {
  const origin = req.headers.origin;
  const allowed = getAllowedOrigins();
  res.setHeader('Vary', 'Origin');
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json').send(JSON.stringify(body));
}

// Vercel's Node runtime normally parses a JSON body into req.body for us, but it
// hands back a string or Buffer when the content type is unexpected, and nothing
// at all when the body is empty. Returns null for anything unusable.
function parseBody(req) {
  const body = req.body;
  if (body === undefined || body === null || body === '') return null;
  if (Buffer.isBuffer(body)) {
    try {
      return JSON.parse(body.toString('utf8'));
    } catch {
      return null;
    }
  }
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return null;
    }
  }
  if (typeof body === 'object' && !Array.isArray(body)) return body;
  return null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Anything interpolated into an email header must not be able to terminate it.
// Quotes and backslashes are dropped too so a display name can be safely quoted.
function sanitizeHeaderText(value) {
  return String(value).replace(/[\r\n]+/g, ' ').replace(/["\\]/g, '').trim();
}

// Returns { values } on success or { error } with a visitor-safe message.
// Every rule here is enforced independently of the browser.
function validate(body) {
  const fields = ['name', 'email', 'subject', 'message'];
  const values = {};

  for (const field of fields) {
    const raw = body[field];
    if (typeof raw !== 'string') {
      return { error: `Field "${field}" is required and must be text.` };
    }
    const trimmed = raw.trim();
    if (!trimmed) {
      return { error: `Field "${field}" is required.` };
    }
    if (trimmed.length > MAX[field]) {
      return { error: `Field "${field}" must be ${MAX[field]} characters or fewer.` };
    }
    values[field] = trimmed;
  }

  if (!EMAIL_PATTERN.test(values.email)) {
    return { error: 'Please provide a valid email address.' };
  }

  // The subject becomes part of a real header, so a line break in it would let a
  // caller append headers of their own. Checked before the prefix is applied.
  if (/[\r\n]/.test(values.subject)) {
    return { error: 'Field "subject" must not contain line breaks.' };
  }

  return { values };
}

function buildEmail({ name, email, subject, message }) {
  const safe = {
    name: escapeHtml(name),
    email: escapeHtml(email),
    subject: escapeHtml(subject),
    // Escape first, then turn newlines into markup — never the other way around.
    message: escapeHtml(message).replace(/\r?\n/g, '<br />'),
  };

  const row = (label, value) => `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e6e8eb;vertical-align:top;width:110px;
                   font:600 12px/1.4 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;
                   letter-spacing:.06em;text-transform:uppercase;color:#6b7480;">${label}</td>
        <td style="padding:14px 0;border-bottom:1px solid #e6e8eb;
                   font:400 15px/1.6 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#12171d;">${value}</td>
      </tr>`;

  const html = `<!doctype html>
<html>
  <body style="margin:0;padding:24px;background:#f5f6f8;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"
           style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e6e8eb;border-radius:10px;">
      <tr>
        <td style="padding:26px 28px 6px;">
          <h1 style="margin:0;font:600 19px/1.3 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#12171d;">
            New Portfolio Contact
          </h1>
        </td>
      </tr>
      <tr>
        <td style="padding:0 28px 22px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
${row('Name', safe.name)}
${row('Email', `<a href="mailto:${safe.email}" style="color:#2d7ff9;text-decoration:none;">${safe.email}</a>`)}
${row('Subject', safe.subject)}
${row('Message', safe.message)}
${row('Source', 'alexball.dev')}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    'New Portfolio Contact',
    '',
    `Name:\n${name}`,
    '',
    `Email:\n${email}`,
    '',
    `Subject:\n${subject}`,
    '',
    `Message:\n${message}`,
    '',
    'Source:\nalexball.dev',
    '',
  ].join('\n');

  return { subject: `${SUBJECT_PREFIX}${subject}`, html, text };
}

export default async function handler(req, res) {
  applyCors(req, res);
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST, OPTIONS');
    sendJson(res, 405, { error: 'Method not allowed' });
    return;
  }

  const body = parseBody(req);
  if (!body) {
    sendJson(res, 400, { error: 'Invalid request body' });
    return;
  }

  // Answered exactly like a real send so a bot learns nothing from the response.
  const honeypot = body[HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim()) {
    console.warn('api/contact: honeypot triggered — submission discarded');
    sendJson(res, 200, { success: true, message: 'Message sent successfully.' });
    return;
  }

  const { values, error: validationError } = validate(body);
  if (validationError) {
    sendJson(res, 400, { error: validationError });
    return;
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('api/contact: missing required env var(s)', { hasApiKey: false });
    sendJson(res, 500, { error: 'Server configuration error' });
    return;
  }

  const fromEmail = process.env.CONTACT_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const toEmail = process.env.CONTACT_TO_EMAIL || DEFAULT_TO_EMAIL;
  const { subject, html, text } = buildEmail(values);

  try {
    const resend = new Resend(apiKey);
    // The visitor's address is never used as `from` — that would be spoofing an
    // unauthenticated domain. It goes in replyTo, so Reply reaches them directly.
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${fromEmail}>`,
      to: toEmail,
      replyTo: `"${sanitizeHeaderText(values.name)}" <${values.email}>`,
      subject,
      html,
      text,
    });

    if (error) {
      console.error('api/contact: Resend rejected the message —', error.message);
      sendJson(res, 502, { error: 'Message could not be sent. Please try again.' });
      return;
    }

    console.log('api/contact: message sent', { id: data?.id });
    sendJson(res, 200, { success: true, message: 'Message sent successfully.' });
  } catch (err) {
    console.error('api/contact: unexpected failure —', err.message);
    sendJson(res, 500, { error: 'Message could not be sent. Please try again.' });
  }
}
