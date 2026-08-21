import { useApp } from '../../context/AppContext';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';
import SectionHead from '../../ui/SectionHead';

export default function Stack() {
  const { data, strings } = useApp();
  const T = strings.stack;
  return (
    <section id="stack" className="band">
      <div className="wrap">
        <SectionHead idx="03" label="Technology Stack" title={T.title} sub={T.sub} />
        <div className="stack-grid">
          {data.stack.map((cat, i) => (
            <Reveal className={`card stack-cat ${cat.gold ? 'gold' : ''}`} key={cat.cat} delay={i * 80}>
              <div className="cat-h">
                <span className="ci" style={cat.gold ? { background: 'rgba(212,175,55,0.08)', borderColor: 'rgba(212,175,55,0.18)', color: 'var(--gold-soft)' } : {}}>
                  <Icon name={cat.icon} />
                </span>
                <span className="tt">{cat.cat}</span>
              </div>
              <div className="stack-skills">
                {cat.skills.map((s) => <span className="skill-pill" key={s}>{s}</span>)}
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal className="card learning-banner">
          <div className="lb-l">
            <span className="lb-ic"><Icon name="rocket" /></span>
            <div>
              <div className="lb-k">{T.looking_ahead}</div>
              <div className="lb-v">{T.cloud_tools}</div>
            </div>
          </div>
          <div className="lb-tags">
            {data.learning.map((t) => <span className="tag" key={t}>{t}</span>)}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
