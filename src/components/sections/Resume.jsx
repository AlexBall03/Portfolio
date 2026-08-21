import { useApp } from '../../context/AppContext';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';
import SectionHead from '../../ui/SectionHead';

export default function Resume() {
  const { data, strings } = useApp();
  const T = strings.resume;

  return (
    <section id="resume" className="band">
      <div className="wrap">
        <SectionHead idx="07" label="Resume" title={T.title} sub={T.sub} />
        <div className="resume-grid">
          <Reveal className="resume-info">
            <div className="resume-highlights">
              {data.resumeHighlights.map((h) => (
                <div className="rh" key={h.t}>
                  <span className="rh-ic"><Icon name="check" /></span>
                  <div>
                    <div className="rh-t">{h.t}</div>
                    <div className="rh-d">{h.d}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 'auto' }}>
              <a className="btn btn-primary" href={data.identity.resume} download>
                <Icon name="download" /> {T.download}
              </a>
              <a className="btn btn-ghost" href={data.identity.resume} target="_blank" rel="noreferrer">
                <Icon name="external" /> {T.open_full}
              </a>
            </div>
          </Reveal>

          <Reveal delay={120} className="card resume-viewer">
            <div className="resume-bar">
              <div className="dots"><i /><i /><i /></div>
              <span className="fname">Alexander-Ball-Resume.pdf</span>
              <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--faint)' }}>PDF</span>
            </div>
            <iframe className="resume-frame" src={`${data.identity.resume}#view=FitH&toolbar=0`} title="Resume" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
