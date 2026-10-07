import 'server-only';
import { Resend } from 'resend';
import { contactEnv } from '@/config/env';

/**
 * Resend boundary. Configuration (API key, sender, recipient) is read here and
 * nowhere else; callers pass only message content.
 */
export interface OutgoingEmail {
  fromName: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailError extends Error {
  override name = 'EmailError';
}

let client: Resend | undefined;

/** Sends an email to the configured site inbox. Returns the provider message id. */
export async function sendToSiteInbox(email: OutgoingEmail): Promise<string | null> {
  const env = contactEnv();
  client ??= new Resend(env.RESEND_API_KEY);
  // The visitor's address is never `from` (that would spoof an unverified
  // domain); it goes in Reply-To so replying reaches them directly.
  const { data, error } = await client.emails.send({
    from: `${email.fromName} <${env.CONTACT_FROM_EMAIL}>`,
    to: env.CONTACT_TO_EMAIL,
    replyTo: email.replyTo,
    subject: email.subject,
    html: email.html,
    text: email.text,
  });
  if (error) throw new EmailError(`Resend rejected the message: ${error.message}`);
  return data?.id ?? null;
}
