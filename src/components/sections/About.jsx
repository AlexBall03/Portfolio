import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';
import SectionHead from '../../ui/SectionHead';

export default function About() {
  const { data, strings } = useApp();
  const T = strings.about;
  const [lit, setLit] = useState(0);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setLit((v) => (v + 1) % data.roles.length), 1900);
    return () => clearInterval(t);
  }, [data.roles.length]);

  return (
    <section id="about" className="band">
      <div className="wrap">
        <SectionHead idx="02" label="About" title={T.title} sub={T.sub} />
        <div className="about-grid">
          <Reveal className="about-left">
            <div className="about-roles">
              {data.roles.map((r, i) => (
                <div key={r.t} className={`ar ${r.gold ? 'g' : ''} ${i === lit ? 'lit' : ''}`}>
                  <span className="d">◆</span> {r.t}
                </div>
              ))}
            </div>
            <div className="about-body">
              {data.about.map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </Reveal>

          <Reveal delay={120} className="diff-list">
            {data.differentiators.map((d) => (
              <div className="card diff" key={d.t}>
                <span className="di"><Icon name={d.icon} /></span>
                <div>
                  <div className="dt">{d.t}</div>
                  <div className="dd">{d.d}</div>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
