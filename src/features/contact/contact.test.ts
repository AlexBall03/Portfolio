import { describe, expect, it } from 'vitest';
import { buildContactEmail, sanitizeHeaderText } from './email';
import { validateContact } from './schema';

const valid = { name: ' Ada ', email: 'ada@example.com', subject: 'Hello', message: 'Hi there' };

describe('contact validation', () => {
  it('accepts and trims a valid message', () => {
    expect(validateContact(valid)).toEqual({
      ok: true,
      data: { name: 'Ada', email: 'ada@example.com', subject: 'Hello', message: 'Hi there' },
    });
  });

  it('reports one localized error key per field', () => {
    const result = validateContact({ name: '', email: 'nope', subject: 'a\r\nBcc: x@y.z', message: null });
    expect(result).toEqual({
      ok: false,
      errors: {
        name: 'nameRequired',
        email: 'emailInvalid',
        subject: 'subjectInvalid',
        message: 'messageRequired',
      },
    });
  });

  it('enforces length limits', () => {
    const result = validateContact({ ...valid, message: 'x'.repeat(5001) });
    expect(result.ok === false && result.errors.message).toBe('tooLong');
  });
});

describe('contact email', () => {
  it('escapes visitor input in HTML and keeps it raw in plain text', () => {
    const email = buildContactEmail(
      { name: '<b>Eve</b>', email: 'eve@example.com', subject: 'Hi & bye', message: 'line1\n<script>' },
      'alexball.dev',
    );
    expect(email.subject).toBe('Portfolio Contact — Hi & bye');
    expect(email.html).toContain('&lt;b&gt;Eve&lt;/b&gt;');
    expect(email.html).toContain('line1<br />&lt;script&gt;');
    expect(email.html).not.toContain('<script>');
    expect(email.text).toContain('<b>Eve</b>');
  });

  it('strips characters that could break a header display name', () => {
    expect(sanitizeHeaderText('Ev"e\\\r\nBcc')).toBe('Eve Bcc');
  });
});
