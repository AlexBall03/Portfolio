import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../ui/Icon';

const MOBILE_ICONS = {
  home: 'bolt', about: 'user', projects: 'cube',
  experience: 'briefcase', resume: 'award', contact: 'mail',
};

// Pulled out of the desktop link row and rendered as the nav's call to action.
// The mobile drawer still lists every screen, this one included.
const CTA_ID = 'contact';

export default function Nav({ screens }) {
  const { screen } = useApp();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
  }, [menuOpen]);

  useEffect(() => {
    let raf = 0;
    const THRESHOLD = 24;
    const update = () => {
      raf = 0;
      setScrolled(window.scrollY > THRESHOLD);
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const navLinks = screens.filter((n) => n.id !== CTA_ID);
  const cta = screens.find((n) => n.id === CTA_ID);

  return (
    <>
      <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-inner">
          <Link to="/" className="nav-logo" onClick={closeMenu}>
            <span className="bk">&lt;/</span>Alex<span className="dash">-</span>Ball<span className="bk">\&gt;</span>
          </Link>
          <div className="nav-links">
            {navLinks.map((n) => (
              <Link key={n.id} to={n.path} className={screen === n.id ? 'active' : ''}
                 onClick={closeMenu}>
                {n.label}
              </Link>
            ))}
          </div>
          {cta && (
            <Link
              to={cta.path}
              className={`btn btn-outline nav-cta ${screen === cta.id ? 'is-active' : ''}`}
              aria-current={screen === cta.id ? 'page' : undefined}
              onClick={closeMenu}
            >
              {cta.label}
            </Link>
          )}
        </div>
      </nav>

      {!menuOpen && (
        <button className="nav-burger" aria-label="Menu" onClick={() => setMenuOpen(true)}>
          <Icon name="menu" />
        </button>
      )}

      <div className={`mobile-scrim ${menuOpen ? 'open' : ''}`} onClick={closeMenu} />
      <div className={`mobile-drawer ${menuOpen ? 'open' : ''}`}>
        <div className="mobile-drawer-head">
          <span className="nav-logo" style={{ padding: 0, margin: 0, border: 0 }}>
            <span className="bk">&lt;/</span>Alex<span className="dash">-</span>Ball<span className="bk">\&gt;</span>
          </span>
          <button className="drawer-close" aria-label="Close" onClick={closeMenu}>
            <Icon name="x" />
          </button>
        </div>
        <div className="mobile-drawer-links">
          {screens.map((n, i) => (
            <Link key={n.id} to={n.path}
               className={`d-link ${screen === n.id ? 'active' : ''}`}
               onClick={closeMenu}>
              <span className="d-ic"><Icon name={MOBILE_ICONS[n.id]} /></span>
              <span className="d-label">{n.label}</span>
              <span className="d-n">{String(i + 1).padStart(2, '0')}</span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
