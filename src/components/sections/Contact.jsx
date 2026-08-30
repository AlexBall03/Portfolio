import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { sendContactMessage } from '../../services/contact';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';

const EMPTY_FORM = { name: '', email: '', subject: '', message: '', company: '' };

export default function Contact() {
  const { data, strings } = useApp();
  const D = data.identity;
  const T = strings.contact;
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | sending | error
  const [sent, setSent] = useState(false);
  // Captured before the form is cleared so the success panel can still greet by name.
  const [sentName, setSentName] = useState('');

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;

    const er = {};
    if (!form.name.trim())    er.name    = T.err_name;
    if (!form.email.trim())   er.email   = T.err_email_empty;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = T.err_email_bad;
    if (!form.subject.trim()) er.subject = T.err_subject;
    if (!form.message.trim()) er.message = T.err_message;
    setErrors(er);
    if (Object.keys(er).length) return;

    setStatus('sending');
    try {
      await sendContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        company: form.company,
      });
      setSentName(form.name.trim());
      setForm(EMPTY_FORM);
      setStatus('idle');
      setSent(true);
    } catch {
      // The server's message is deliberately generic; show our own localized copy.
      setStatus('error');
    }
  };

  const reset = () => {
    setSent(false);
    setForm(EMPTY_FORM);
    setErrors({});
    setStatus('idle');
  };

  const sending = status === 'sending';

  const channels = [
    { icon: 'mail',     k: T.email_k,    v: D.email,               href: `mailto:${D.email}` },
    { icon: 'linkedin', k: T.linkedin_k, v: 'in/alexball03',        href: D.linkedin },
    { icon: 'github',   k: T.github_k,   v: '@' + D.githubHandle,  href: D.github },
  ];

  return (
    <section id="contact" className="band">
      <div className="wrap">
        <Reveal className="card contact-card">
          <div className="contact-grid">
            <div className="contact-left">
              <div className="eyebrow">
                <span className="idx">08</span><span className="bar" /><span>Contact</span>
              </div>
              {/* heading2 is optional — a locale with a one-line heading leaves it empty. */}
              <h2 style={{ marginTop: 18 }}>{T.heading1}{T.heading2 && <><br />{T.heading2}</>}</h2>
              <p className="lead">{T.lead}</p>
              <div className="contact-channels">
                {channels.map((c) => (
                  <a className="channel" key={c.k} href={c.href}
                     target={c.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                    <span className="ch-ic"><Icon name={c.icon} /></span>
                    <div>
                      <div className="ch-k">{c.k}</div>
                      <div className="ch-v">{c.v}</div>
                    </div>
                    <span className="ch-go"><Icon name="arrowUpRight" style={{ width: 17, height: 17 }} /></span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              {sent ? (
                <div className="form-success" role="status">
                  <span className="ok-ic"><Icon name="check" /></span>
                  <h3 style={{ fontSize: '1.5rem' }}>{T.sent_title}</h3>
                  {/* sent_body opens with its own punctuation, so it butts against the name. */}
                  <p className="dim">{T.sent_thanks} {sentName}{T.sent_body}</p>
                  <button className="btn btn-ghost btn-sm" onClick={reset}>
                    {T.send_another}
                  </button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate>
                  <div className={`form-field ${errors.name ? 'err' : ''}`}>
                    <label>{T.name}</label>
                    <input value={form.name} onChange={set('name')} placeholder={T.name_ph} />
                    {errors.name && <div className="form-err">{errors.name}</div>}
                  </div>
                  <div className={`form-field ${errors.email ? 'err' : ''}`}>
                    <label>{T.email}</label>
                    <input value={form.email} onChange={set('email')} placeholder={T.email_ph} />
                    {errors.email && <div className="form-err">{errors.email}</div>}
                  </div>
                  <div className={`form-field ${errors.subject ? 'err' : ''}`}>
                    <label>{T.subject}</label>
                    <input value={form.subject} onChange={set('subject')} placeholder={T.subject_ph} />
                    {errors.subject && <div className="form-err">{errors.subject}</div>}
                  </div>
                  <div className={`form-field ${errors.message ? 'err' : ''}`}>
                    <label>{T.message}</label>
                    <textarea rows="4" value={form.message} onChange={set('message')} placeholder={T.message_ph} />
                    {errors.message && <div className="form-err">{errors.message}</div>}
                  </div>
                  {/* Honeypot — hidden from sight, tab order, and screen readers.
                      Only a bot fills it in; the server discards anything that does. */}
                  <div className="hp-field" aria-hidden="true">
                    <input type="text" name="company" tabIndex={-1} autoComplete="off"
                           value={form.company} onChange={set('company')} />
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={sending}
                          style={{ width: '100%', justifyContent: 'center' }}>
                    {sending ? T.sending : <>{T.send} <Icon name="arrowRight" /></>}
                  </button>
                  {status === 'error' && (
                    <p className="form-status err" role="status" aria-live="polite">{T.err_send}</p>
                  )}
                  <p className="mono" style={{ fontSize: '0.7rem', color: 'var(--faint)', marginTop: 14, textAlign: 'center' }}>
                    {T.direct_note} {D.email}
                  </p>
                </form>
              )}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
