import { useApp } from '../../context/AppContext';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';
import SectionHead from '../../ui/SectionHead';
import useCountUp from '../../hooks/useCountUp';
import useRevealRef from '../../hooks/useRevealRef';

function Metric({ m, delay }) {
  const dec = m.value % 1 !== 0 ? 1 : 0;
  const [ref, display] = useCountUp(m.value, { decimals: dec });
  const ringRef = useRevealRef(0.5);
  const C = 2 * Math.PI * 20;
  const off = C * (1 - (m.ring || 0) / 100);
  return (
    <Reveal className="metric card card-hover" delay={delay}>
      <div className={`ic ${m.gold ? 'gold' : ''}`}><Icon name={m.icon} /></div>
      {m.ring != null && (
        <div className="ring" ref={ringRef}>
          <svg viewBox="0 0 46 46">
            <circle cx="23" cy="23" r="20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
            <circle className="ring-fg" cx="23" cy="23" r="20" fill="none"
                    stroke="var(--accent)" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={C} style={{ '--circ': C, '--off': off }} />
          </svg>
          <span className="pct">{m.ring}%</span>
        </div>
      )}
      <div className="val" ref={ref}>
        {display}{m.suffix && <span className="suf">{m.suffix}</span>}
      </div>
      <div className="k">{m.label}</div>
      <div className="note">{m.note}</div>
    </Reveal>
  );
}

export default function Snapshot() {
  const { data, strings } = useApp();
  const T = strings.snapshot;
  return (
    <section id="snapshot" className="band">
      <div className="wrap">
        <SectionHead idx="01" label="Technical Snapshot" title={T.title} sub={T.sub} />
        <div className="snap-grid">
          {data.snapshot.map((m, i) => <Metric key={i} m={m} delay={i * 80} />)}
        </div>
      </div>
    </section>
  );
}
