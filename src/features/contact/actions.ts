'use server';

import { ConfigError } from '@/config/env';
import { SITE_URL } from '@/config/site';
import { sendToSiteInbox } from '@/integrations/resend/client';
import { createLogger } from '@/lib/logger';
import { buildContactEmail, sanitizeHeaderText } from './email';
import { HONEYPOT_FIELD, validateContact, type ContactState, type ContactValues } from './schema';

const log = createLogger('contact');

/**
 * Contact form Server Action — the trust boundary. Everything is re-validated
 * here regardless of what the browser checked. Works without JavaScript via
 * progressive enhancement (`useActionState` + a plain <form>).
 */
export async function sendContactMessage(_prev: ContactState, formData: FormData): Promise<ContactState> {
  const honeypot = formData.get(HONEYPOT_FIELD);
  const input = {
    name: formData.get('name'),
    email: formData.get('email'),
    subject: formData.get('subject'),
    message: formData.get('message'),
  };

  // Answer a bot exactly like a real send so it learns nothing.
  if (typeof honeypot === 'string' && honeypot.trim()) {
    log.warn('Honeypot triggered; submission discarded');
    return { status: 'sent', name: typeof input.name === 'string' ? input.name.trim() : '' };
  }

  const values: ContactValues = {
    name: String(input.name ?? ''),
    email: String(input.email ?? ''),
    subject: String(input.subject ?? ''),
    message: String(input.message ?? ''),
  };
  const result = validateContact(input);
  if (!result.ok) return { status: 'invalid', errors: result.errors, values };

  const msg = result.data;
  try {
    const email = buildContactEmail(msg, new URL(SITE_URL).host);
    const id = await sendToSiteInbox({
      fromName: 'Portfolio Contact Form',
      replyTo: `"${sanitizeHeaderText(msg.name)}" <${msg.email}>`,
      ...email,
    });
    log.info('Contact message sent', { id });
    return { status: 'sent', name: msg.name };
  } catch (err) {
    log.error('Contact message failed', err);
    return { status: 'error', error: err instanceof ConfigError ? 'unavailable' : 'send', values };
  }
}
