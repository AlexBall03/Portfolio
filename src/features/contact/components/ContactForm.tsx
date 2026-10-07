'use client';

import { useActionState, useState, type FormEvent } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Dictionary } from '@/i18n/get-dictionary';
import { fill } from '@/i18n/paths';
import { sendContactMessage } from '../actions';
import {
  CONTACT_LIMITS,
  HONEYPOT_FIELD,
  validateContact,
  type ContactField,
  type ContactState,
  type FieldErrors,
} from '../schema';

interface ContactFormProps {
  email: string;
  t: Dictionary['contact'];
}

/** Remounting via `key` is how "Send another" resets the action state. */
export function ContactForm(props: ContactFormProps) {
  const [round, setRound] = useState(0);
  return <ContactFormRound key={round} {...props} onReset={() => setRound((r) => r + 1)} />;
}

const FIELDS: {
  name: ContactField;
  type: 'text' | 'email' | 'textarea';
  autoComplete?: string;
}[] = [
  { name: 'name', type: 'text', autoComplete: 'name' },
  { name: 'email', type: 'email', autoComplete: 'email' },
  { name: 'subject', type: 'text', autoComplete: 'off' },
  { name: 'message', type: 'textarea' },
];

function ContactFormRound({ email, t, onReset }: ContactFormProps & { onReset: () => void }) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: 'idle' });
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);

  if (state.status === 'sent') {
    return (
      <div className="form-success" role="status">
        <span className="ok-ic">
          <Icon name="check" />
        </span>
        <h3 style={{ fontSize: '1.5rem' }}>{t.sentTitle}</h3>
        <p className="dim">{fill(t.sentBody, { name: state.name })}</p>
        <button type="button" className="btn btn-ghost btn-sm" onClick={onReset}>
          {t.sendAnother}
        </button>
      </div>
    );
  }

  const serverErrors = state.status === 'invalid' ? state.errors : {};
  const errors: FieldErrors = clientErrors ?? serverErrors;
  const values = state.status === 'invalid' || state.status === 'error' ? state.values : null;

  // Instant feedback in the browser; the Server Action re-validates regardless.
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    const data = Object.fromEntries(new FormData(e.currentTarget));
    const result = validateContact(data);
    if (!result.ok) {
      e.preventDefault();
      setClientErrors(result.errors);
      const first = FIELDS.find((f) => result.errors[f.name]);
      if (first) document.getElementById(`contact-${first.name}`)?.focus();
    } else {
      setClientErrors({});
    }
  };

  const clearError = (field: ContactField) =>
    setClientErrors((prev) => (prev?.[field] ? { ...prev, [field]: undefined } : prev));

  return (
    <form action={formAction} onSubmit={onSubmit} noValidate>
      {FIELDS.map((f) => {
        const id = `contact-${f.name}`;
        const error = errors[f.name];
        const common = {
          id,
          name: f.name,
          defaultValue: values?.[f.name],
          placeholder: t[`${f.name}Placeholder`],
          maxLength: CONTACT_LIMITS[f.name],
          required: true,
          'aria-invalid': error ? true : undefined,
          'aria-describedby': error ? `${id}-error` : undefined,
          onChange: () => clearError(f.name),
        };
        return (
          <div key={f.name} className={`form-field ${error ? 'err' : ''}`}>
            <label htmlFor={id}>{t[f.name]}</label>
            {f.type === 'textarea' ? (
              <textarea rows={4} {...common} />
            ) : (
              <input type={f.type} autoComplete={f.autoComplete} {...common} />
            )}
            {error && (
              <div className="form-err" id={`${id}-error`}>
                {t.errors[error]}
              </div>
            )}
          </div>
        );
      })}

      {/* Honeypot: hidden from sight, tab order, and assistive tech. */}
      <div className="hp-field" aria-hidden="true">
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
      </div>

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending}
        style={{ width: '100%', justifyContent: 'center' }}
      >
        {pending ? (
          t.sending
        ) : (
          <>
            {t.send} <Icon name="arrowRight" />
          </>
        )}
      </button>

      <p className="form-status err" role="alert">
        {state.status === 'error' ? t.errors[state.error] : ''}
      </p>

      <p className="mono" style={{ fontSize: '0.7rem', color: 'var(--faint)', marginTop: 14, textAlign: 'center' }}>
        {t.directNote} <a href={`mailto:${email}`}>{email}</a>
      </p>
    </form>
  );
}
