import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import Icon from '../ui/Icon';

const MOBILE_ICONS = {
  home: 'bolt', about: 'user', projects: 'cube',
  experience: 'briefcase', resume: 'award', contact: 'mail',
};

export default function Nav({ screens }) {
  const { screen, goToScreen } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }, [menuOpen]);

  const go = (e, id) => {
    e.preventDefault();
    setMenuOpen(false);
    goToScreen(id);
  };

  return (
    <>
      <nav className="nav scrolled">
        <div className="nav-inner">
          <a href="#home" className="nav-logo" onClick={(e) => go(e, 'home')}>
            <span className="bk">&lt;/</span>Alex<span className="dash">-</span>Ball<span className="bk">\&gt;</span>
          </a>
          <div className="nav-links">
            {screens.map((n) => (
              <a key={n.id} href={`#${n.id}`} className={screen === n.id ? 'active' : ''}
                 onClick={(e) => go(e, n.id)}>
                {n.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {!menuOpen && (
        <button className="nav-burger" aria-label="Menu" onClick={() => setMenuOpen(true)}>
          <Icon name="menu" />
        </button>
      )}

      <div className={`mobile-scrim ${menuOpen ? 'open' : ''}`} onClick={() => setMenuOpen(false)} />
      <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-head">
          <span className="nav-logo" style={{ padding: 0, margin: 0, border: 0 }}>
            <span className="bk">&lt;/</span>Alex<span className="dash">-</span>Ball<span className="bk">\&gt;</span>
          </span>
          <button className="drawer-close" aria-label="Close" onClick={() => setMenuOpen(false)}>
            <Icon name="x" />
          </button>
        </div>
        <div className="mobile-drawer-links">
          {screens.map((n, i) => (
            <a key={n.id} href={`#${n.id}`}
               className={`d-link ${screen === n.id ? 'active' : ''}`}
               onClick={(e) => go(e, n.id)}>
              <span className="d-ic"><Icon name={MOBILE_ICONS[n.id]} /></span>
              <span className="d-label">{n.label}</span>
              <span className="d-n">{String(i + 1).padStart(2, '0')}</span>
            </a>
          ))}
        </div>
      </div>
    </>
  );
}
