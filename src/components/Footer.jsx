import { useApp } from '../context/AppContext';
import Icon from '../ui/Icon';

export default function Footer() {
  const { data, strings, locale, setLocale, theme, setTheme, LOCALES } = useApp();
  const D = data.identity;
  const T = strings.footer;

  const links = [
    { label: T.github,   href: D.github },
    { label: T.linkedin, href: D.linkedin },
    { label: T.email,    href: `mailto:${D.email}` },
    { label: T.resume,   href: D.resume },
  ];

  return (
    <footer className="footer">
      <div className="wrap footer-inner">
        <div className="f-logo">
          <span className="bk">&lt;/</span>Alex<span className="dash">-</span>Ball<span className="bk">\&gt;</span>
        </div>
        <div className="f-links">
          {links.map((l) => (
            <a key={l.label} href={l.href}
               target={l.href.startsWith('http') ? '_blank' : undefined}
               rel="noreferrer">
              {l.label}
            </a>
          ))}
        </div>
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
        <div className="f-copy">© {new Date().getFullYear()} Alexander D. Ball</div>
      </div>
    </footer>
  );
}
