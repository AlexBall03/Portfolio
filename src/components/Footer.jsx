import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../ui/Icon';

export default function Footer({ screens }) {
  const { data, strings, locale, setLocale, theme, setTheme, LOCALES, screen } = useApp();
  const D = data.identity;
  const T = strings.footer;

  const links = [
    { key: 'github',   label: T.github,   href: D.github,            icon: 'github' },
    { key: 'linkedin', label: T.linkedin, href: D.linkedin,           icon: 'linkedin' },
    { key: 'email',    label: T.email,    href: `mailto:${D.email}`, icon: 'mail' },
    { key: 'resume',   label: T.resume,   href: D.resume,            icon: 'download' },
  ];

  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="f-col f-col-brand">
          <div className="f-logo">
            <span className="bk">&lt;/</span>Alex<span className="dash">-</span>Ball<span className="bk">\&gt;</span>
          </div>
          <p className="f-statement">{D.statement}</p>
        </div>

        <nav className="f-col f-col-nav" aria-label={T.siteLabel}>
          <span className="f-col-title mono">{T.siteLabel}</span>
          {screens.map((s) => (
            <Link key={s.id} to={s.path} className={screen === s.id ? 'active' : ''}>
              {s.label}
            </Link>
          ))}
        </nav>

        <div className="f-col f-col-connect">
          <span className="f-col-title mono">{T.connectLabel}</span>
          <div className="f-links">
            {links.map((l) => (
              <a key={l.key} href={l.href}
                 target={l.href.startsWith('http') ? '_blank' : undefined}
                 rel="noreferrer">
                <Icon name={l.icon} /> <span>{l.label}</span>
              </a>
            ))}
          </div>
        </div>

        <div className="f-col f-col-prefs">
          <div className="f-prefs">
            <button className="pref-toggle" aria-label={strings.toggles.theme}
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
              <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
              <span>{theme === 'dark' ? strings.toggles.dark : strings.toggles.light}</span>
            </button>
            <div className="lang-toggle" role="group" aria-label={strings.toggles.lang}>
              {LOCALES.map((l) => (
                <button key={l} className={locale === l ? 'on' : ''} onClick={() => setLocale(l)}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="wrap footer-bottom">
        <div className="f-copy">{new Date().getFullYear()} Alexander D. Ball</div>
        <div className="f-stack mono">React · Vite · Vercel</div>
      </div>
    </footer>
  );
}
