import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHead } from '@/components/ui/SectionHead';
import type { SectionContent } from '@/features/site/types';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { Highlight, Profile } from '../types';

interface ResumeProps {
  section: SectionContent;
  profile: Profile;
  highlights: Highlight[];
  t: Dictionary['resume'];
}

export function Resume({ section, profile, highlights, t }: ResumeProps) {
  const resume = profile.resume;
  const fileName = resume?.src.split('/').pop() ?? '';

  return (
    <section id="resume" className="band" aria-labelledby="resume-title">
      <div className="wrap">
        <SectionHead index="07" content={section} as="h1" id="resume-title" />
        <div className="resume-grid">
          <Reveal className="resume-info">
            <ul className="resume-highlights">
              {highlights.map((h) => (
                <li className="rh" key={h.title}>
                  <span className="rh-ic">
                    <Icon name={h.icon ?? 'check'} />
                  </span>
                  <div>
                    <div className="rh-t">{h.title}</div>
                    <div className="rh-d">{h.body}</div>
                  </div>
                </li>
              ))}
            </ul>
            {resume && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 'auto' }}>
                <a className="btn btn-primary" href={resume.src} download>
                  <Icon name="download" /> {t.download}
                </a>
                <a className="btn btn-ghost" href={resume.src} target="_blank" rel="noopener noreferrer">
                  <Icon name="external" /> {t.openFull}
                </a>
              </div>
            )}
          </Reveal>

          {resume && (
            <Reveal delay={120} className="card resume-viewer">
              <div className="resume-bar">
                <div className="dots" aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </div>
                <span className="fname">{fileName}</span>
                <span className="mono" style={{ fontSize: '0.72rem', color: 'var(--faint)' }}>
                  PDF
                </span>
              </div>
              <iframe
                className="resume-frame"
                src={`${resume.src}#view=FitH&toolbar=0`}
                title={t.viewerTitle}
                loading="lazy"
              />
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
