import { useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';
import SectionHead from '../../ui/SectionHead';

function ghCells() {
  let s = 7;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const cells = [];
  for (let w = 0; w < 26; w++) {
    for (let d = 0; d < 7; d++) {
      const r = rnd();
      let lvl = 0;
      if (r > 0.55) lvl = 1;
      if (r > 0.72) lvl = 2;
      if (r > 0.85) lvl = 3;
      if (r > 0.94) lvl = 4;
      cells.push(lvl);
    }
  }
  return cells;
}

export default function GitHub() {
  const { data, strings } = useApp();
  const T = strings.github;
  const cells = useMemo(ghCells, []);

  return (
    <section id="github" className="band">
      <div className="wrap">
        <SectionHead idx="05" label="GitHub Activity" title={T.title} sub={T.sub} />
        <div className="gh-grid">
          <Reveal className="card gh-card">
            <div className="gh-head">
              <div className="gh-user">
                <span className="gh-ava"><Icon name="github" /></span>
                <div>
                  <div className="u-name">{data.identity.name}</div>
                  <a className="u-handle" href={data.identity.github} target="_blank" rel="noreferrer">
                    @{data.identity.githubHandle}
                  </a>
                </div>
              </div>
              <a className="btn btn-ghost btn-sm" href={data.identity.github} target="_blank" rel="noreferrer">
                <Icon name="github" /> {T.follow}
              </a>
            </div>
            <div className="gh-contrib">
              {cells.map((l, i) => <span key={i} className={`gh-cell ${l ? 'l' + l : ''}`} />)}
            </div>
            <div className="gh-legend">
              <span>{T.less}</span>
              <span className="lg gh-cell" /><span className="lg gh-cell l1" />
              <span className="lg gh-cell l2" /><span className="lg gh-cell l3" /><span className="lg gh-cell l4" />
              <span>{T.more}</span>
            </div>
            <div className="hr" style={{ margin: '24px 0' }} />
            <div className="gh-repos">
              {data.github.repos.map((r) => (
                <a className="gh-repo" key={r.name} href={data.identity.github} target="_blank" rel="noreferrer">
                  <div className="r-name"><Icon name="branch" style={{ width: 14, height: 14 }} /> {r.name}</div>
                  <div className="r-desc">{r.desc}</div>
                  <div className="r-meta">
                    <span className="lang"><span className="dot" style={{ background: r.color }} /> {r.lang}</span>
                    <span>{T.updated}</span>
                  </div>
                </a>
              ))}
            </div>
          </Reveal>

          <Reveal delay={100} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div className="gh-stats">
              {data.github.stats.map((s) => (
                <div className="gh-stat" key={s.k}>
                  <div className="gv">{s.v}</div>
                  <div className="gk">{s.k}</div>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding: 24, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, display: 'grid', placeItems: 'center', background: 'rgba(45,127,249,0.1)', border: '1px solid rgba(45,127,249,0.2)', color: 'var(--accent-300)' }}>
                <Icon name="bolt" />
              </span>
              <p style={{ color: 'var(--text)', fontSize: '0.96rem' }}>{T.blurb}</p>
              <a className="link-arrow" href={data.identity.github} target="_blank" rel="noreferrer">
                {T.explore} <Icon name="arrowUpRight" />
              </a>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
