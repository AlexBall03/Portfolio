'use client';

import { useActionState, useState, type FormEvent } from 'react';
import { buttonStyles } from '@/components/ui/button-styles';
import { Icon } from '@/components/ui/Icon';
import { copy, fill } from '@/config/copy';
import { cn } from '@/lib/cn';
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
}

const t = copy.contact;

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

const CONTROL =
  'w-full rounded-md border border-line-strong bg-surface-inset/70 px-4 py-3 text-base text-fg transition-[border-color,box-shadow,background-color] placeholder:text-fg-faint ' +
  'hover:border-fg/25 focus:border-brand focus:bg-surface-inset focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--focus)_18%,transparent)] focus:outline-none ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--danger)_18%,transparent)]';

function ContactFormRound({ email, onReset }: ContactFormProps & { onReset: () => void }) {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(sendContactMessage, { status: 'idle' });
  const [clientErrors, setClientErrors] = useState<FieldErrors | null>(null);
  const values = state.status === 'invalid' || state.status === 'error' ? state.values : null;
  const [messageLength, setMessageLength] = useState(values?.message?.length ?? 0);

  if (state.status === 'sent') {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center gap-4 py-8 text-center" role="status">
        <span className="grid size-14 place-items-center rounded-full border border-success/35 bg-success/10 text-success [&_svg]:size-6">
          <Icon name="check" />
        </span>
        <h2 className="text-h2">{t.sentTitle}</h2>
        <p className="max-w-[40ch] text-body-sm text-fg-muted">{fill(t.sentBody, { name: state.name })}</p>
        <button type="button" className={buttonStyles({ variant: 'secondary', size: 'sm', className: 'mt-2' })} onClick={onReset}>
          {t.sendAnother}
        </button>
      </div>
    );
  }

  const serverErrors = state.status === 'invalid' ? state.errors : {};
  const errors: FieldErrors = clientErrors ?? serverErrors;

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
    <form action={formAction} onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        {FIELDS.map((f) => {
          const id = `contact-${f.name}`;
          const error = errors[f.name];
          const isMessage = f.type === 'textarea';
          const common = {
            id,
            name: f.name,
            defaultValue: values?.[f.name],
            placeholder: t[`${f.name}Placeholder`],
            maxLength: CONTACT_LIMITS[f.name],
            required: true,
            'aria-invalid': error ? true : undefined,
            'aria-describedby': error ? `${id}-error` : undefined,
            className: CONTROL,
          };
          return (
            <div key={f.name} className={cn('flex flex-col gap-2', (f.name === 'subject' || isMessage) && 'sm:col-span-2')}>
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={id} className="text-body-sm font-medium text-fg">
                  {t[f.name]}
                </label>
                {isMessage && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      'font-mono text-micro tabular-nums',
                      messageLength > CONTACT_LIMITS.message * 0.9 ? 'text-warning' : 'text-fg-faint',
                    )}
                  >
                    {messageLength}/{CONTACT_LIMITS.message}
                  </span>
                )}
              </div>
              {isMessage ? (
                <textarea
                  rows={6}
                  {...common}
                  className={cn(CONTROL, 'min-h-36 resize-y')}
                  onChange={(e) => {
                    clearError(f.name);
                    setMessageLength(e.target.value.length);
                  }}
                />
              ) : (
                <input type={f.type} autoComplete={f.autoComplete} {...common} onChange={() => clearError(f.name)} />
              )}
              {error && (
                <p id={`${id}-error`} className="flex items-center gap-1.5 text-body-sm text-danger">
                  <Icon name="alert" className="size-4 shrink-0" />
                  {t.errors[error]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Honeypot: hidden from sight, tab order, and assistive tech. */}
      <div className="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" />
      </div>

      <button type="submit" disabled={pending} className={buttonStyles({ size: 'lg', className: 'mt-1 w-full' })}>
        {pending ? (
          <>
            <span aria-hidden="true" className="size-4 rounded-full border-2 border-current border-r-transparent motion-safe:animate-spin" />
            {t.sending}
          </>
        ) : (
          <>
            {t.send} <Icon name="arrowRight" />
          </>
        )}
      </button>

      <p role="alert" className={cn('text-center text-body-sm text-danger', state.status !== 'error' && 'sr-only')}>
        {state.status === 'error' ? t.errors[state.error] : ''}
      </p>

      <p className="text-center text-micro text-fg-faint">
        {t.directNote}{' '}
        <a href={`mailto:${email}`} className="text-brand-fg underline-offset-4 hover:underline">
          {email}
        </a>
      </p>
    </form>
  );
}
