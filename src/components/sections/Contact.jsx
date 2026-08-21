import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';

export default function Contact() {
  const { data, strings } = useApp();
  const D = data.identity;
  const T = strings.contact;
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const submit = (e) => {
    e.preventDefault();
    const er = {};
    if (!form.name.trim())    er.name    = T.err_name;
    if (!form.email.trim())   er.email   = T.err_email_empty;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) er.email = T.err_email_bad;
    if (!form.message.trim()) er.message = T.err_message;
    setErrors(er);
    if (Object.keys(er).length) return;
    const subject = encodeURIComponent(`Portfolio inquiry — ${form.name}`);
    const body    = encodeURIComponent(`${form.message}\n\n— ${form.name}\n${form.email}`);
    window.location.href = `mailto:${D.email}?subject=${subject}&body=${body}`;
    setSent(true);
  };

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
              <h2 style={{ marginTop: 18 }}>{T.heading1}<br />{T.heading2}</h2>
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
                <div className="form-success">
                  <span className="ok-ic"><Icon name="check" /></span>
                  <h3 style={{ fontSize: '1.5rem' }}>{T.sent_title}</h3>
                  <p className="dim">{T.sent_thanks} {form.name.split(' ')[0]} {T.sent_body}</p>
                  <button className="btn btn-ghost btn-sm"
                          onClick={() => { setSent(false); setForm({ name: '', email: '', message: '' }); }}>
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
                  <div className={`form-field ${errors.message ? 'err' : ''}`}>
                    <label>{T.message}</label>
                    <textarea rows="4" value={form.message} onChange={set('message')} placeholder={T.message_ph} />
                    {errors.message && <div className="form-err">{errors.message}</div>}
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    {T.send} <Icon name="arrowRight" />
                  </button>
                  <p className="mono" style={{ fontSize: '0.7rem', color: 'var(--faint)', marginTop: 14, textAlign: 'center' }}>
                    {T.opens_client} {D.email}
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
