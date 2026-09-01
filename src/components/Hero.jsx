import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Reveal from '../ui/Reveal';
import Icon from '../ui/Icon';

export default function Hero() {
  const { data, strings } = useApp();
  const D = data.identity;
  const T = strings.hero;

  return (
    <section id="home" className="hero band">
      <div className="wrap">
        <div className="hero-grid">
          <div className="hero-left">
            <Reveal as="div" className="status-badge">
              <span className="status-dot" />
              {D.availability}
            </Reveal>

            <Reveal delay={110}>
              <h1 className="display" style={{ marginTop: 26 }}>
                Alexander<br />D. Ball
              </h1>
            </Reveal>

            <Reveal delay={170}>
              <div className="role">
                <span className="label">{D.title}</span>
                <span className="rule" />
              </div>
            </Reveal>

            <Reveal delay={230}>
              <p className="statement">{D.statement}</p>
            </Reveal>

            <Reveal delay={300}>
              <div className="hero-cta">
                <Link to="/contact" className="btn btn-primary">
                  {T.cta_contact} <Icon name="arrowRight" />
                </Link>
                <Link to="/projects" className="btn btn-ghost">
                  {T.cta_projects}
                </Link>
              </div>
            </Reveal>

            <Reveal delay={360}>
              <div className="hero-meta">
                <div className="m">
                  <div className="k">{T.focus_label}</div>
                  <div className="v">{T.focus_val}</div>
                </div>
                <div className="m">
                  <div className="k">{T.stack_label}</div>
                  <div className="v">{T.stack_val}</div>
                </div>
                <div className="m">
                  <div className="k">{T.based_label}</div>
                  <div className="v">{D.location}</div>
                </div>
              </div>
            </Reveal>
          </div>

          <Reveal delay={200} className="headshot-wrap">
            <div className="headshot-frame">
              <span className="corner tl" /><span className="corner tr" />
              <span className="corner bl" /><span className="corner br" />
              <img className="headshot-img" src="/assets/headshot.png" alt="Alexander D. Ball" />
              <div className="headshot-grad" />
              <div className="headshot-cap">
                <div>
                  <div className="nm">Alexander D. Ball</div>
                  <div className="rl">{D.title}</div>
                </div>
                <div className="sig">&lt;/AB\&gt;</div>
              </div>
            </div>
            <div className="float-chip tl"><span className="dt" /> {T.chip1}</div>
            <div className="float-chip br"><span className="dt" /> {T.chip2}</div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
