import { useApp } from '../../context/AppContext';
import Reveal from '../../ui/Reveal';
import Icon from '../../ui/Icon';
import SectionHead from '../../ui/SectionHead';

function placeholderProjects(T) {
  return [1, 2, 3].map((i) => ({
    n: String(i).padStart(2, '0'),
    name: `${T.placeholder_title} ${i}`,
    tagline: T.placeholder_tagline,
    placeholder: true,
    desc: T.placeholder_desc,
    stack: T.placeholder_tags,
  }));
}

function ProjectCard({ p, delay }) {
  const { strings } = useApp();
  const T = strings.projects;
  const ph = !!p.placeholder;
  return (
    <Reveal delay={delay}>
      <article className={`card card-hover proj-card ${ph ? 'is-placeholder' : ''}`}>
        <div className="proj-media ph">
          <span className="num">{p.n}</span>
          {ph
            ? <span className="badge-ph">{T.placeholder_badge}</span>
            : p.live && <span className="badge-live"><span className="dt" /> Live</span>}
          <span className="ph-tag">{T.project_shot}</span>
        </div>
        <div className="proj-body">
          <div>
            <h3>{p.name}</h3>
            <div className="mono" style={{ color: 'var(--accent-300)', fontSize: '0.8rem', marginTop: 4, letterSpacing: '0.03em' }}>
              {p.tagline}
            </div>
          </div>
          <p className="desc">{p.desc}</p>
          <div className="tag-row">{p.stack.map((s) => <span className="tag" key={s}>{s}</span>)}</div>
          {ph ? (
            <div className="proj-foot ph-note">{T.coming_soon}</div>
          ) : (
            <div className="proj-foot">
              <a className="lk primary" href={p.links.demo}><Icon name="external" /> {T.live_demo}</a>
              <a className="lk" href={p.links.source}><Icon name="github" /> {T.source}</a>
              <a className="lk" href={p.links.study}><Icon name="arrowUpRight" /> {T.case_study}</a>
            </div>
          )}
        </div>
      </article>
    </Reveal>
  );
}

export default function Projects() {
  const { data, strings } = useApp();
  const T = strings.projects;
  const list = data.projects?.length ? data.projects : placeholderProjects(T);
  if (!list.length) return null;
  return (
    <section id="projects" className="band">
      <div className="wrap">
        <SectionHead idx="04" label="Featured Projects" title={T.title} sub={T.sub} />
        <div className="proj-grid">
          {list.map((p, i) => <ProjectCard key={p.name} p={p} delay={i * 90} />)}
        </div>

        <Reveal>
          <div className="row" style={{ justifyContent: 'space-between', margin: '54px 0 14px', flexWrap: 'wrap', gap: 16 }}>
            <h3 style={{ fontSize: '1.3rem' }}>{T.archive_title}</h3>
            <a className="link-arrow" href={data.identity.github} target="_blank" rel="noreferrer">
              {T.all_repos} <Icon name="arrowUpRight" />
            </a>
          </div>
        </Reveal>

        <Reveal className="card archive">
          {data.archive.map((a) => (
            <a className="archive-row" key={a.n} href={data.identity.github} target="_blank" rel="noreferrer">
              <span className="ar-n">{a.n}</span>
              <span className="ar-name">{a.name}</span>
              <span className="ar-desc">{a.desc}</span>
              <span className="ar-tags">
                {a.tags.map((t) => <span className="tag" key={t}>{t}</span>)}
                <span className="ar-go"><Icon name="arrowUpRight" style={{ width: 16, height: 16 }} /></span>
              </span>
            </a>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
