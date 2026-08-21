import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';
import SectionHead from '../../ui/SectionHead';

function TimelineItem({ item, gold }) {
  const { strings } = useApp();
  const T = strings.experience;
  return (
    <Reveal className={`tl-item ${gold ? 'gold' : ''}`}>
      <div className="tl-rail"><span className="node" /></div>
      <div className="tl-content">
        <div className="tl-date">{item.date}{item.current && ` · ${T.current}`}</div>
        <div className="card tl-card">
          <div className="role-line">
            <h4>{item.role}</h4>
          </div>
          <div className="org">{item.org}</div>
          <p className="blurb">{item.blurb}</p>
          {item.tags && (
            <div className="meta">
              {item.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
            </div>
          )}
        </div>
      </div>
    </Reveal>
  );
}

export default function Experience() {
  const { data, strings } = useApp();
  const T = strings.experience;
  const [tab, setTab] = useState('career');
  const list = tab === 'career' ? data.career : data.education;

  return (
    <section id="experience" className="band">
      <div className="wrap">
        <SectionHead idx="06" label="Experience" title={T.title} sub={T.sub}>
          <div className="exp-toggle" role="tablist" style={{ marginTop: 4 }}>
            <button className={tab === 'career' ? 'on' : ''} onClick={() => setTab('career')}
                    role="tab" aria-selected={tab === 'career'}>
              <Icon name="briefcase" /> {T.career}
            </button>
            <button className={tab === 'education' ? 'on' : ''} onClick={() => setTab('education')}
                    role="tab" aria-selected={tab === 'education'}>
              <Icon name="cap" /> {T.education}
            </button>
          </div>
        </SectionHead>

        <div className="timeline" key={tab}>
          {list.map((item, i) => (
            <TimelineItem key={tab + i} item={item} gold={tab === 'education'} />
          ))}
        </div>
      </div>
    </section>
  );
}
