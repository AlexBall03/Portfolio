import { Reveal } from '@/components/ui/Reveal';
import type { SectionContent } from '@/features/site/types';
import type { Locale } from '@/i18n/config';
import type { Dictionary } from '@/i18n/get-dictionary';
import { formatExperienceRange } from '../format';
import type { Experience as ExperienceItem } from '../types';
import { ExperienceTabs } from './ExperienceTabs';

interface ExperienceProps {
  section: SectionContent;
  items: ExperienceItem[];
  locale: Locale;
  t: Dictionary['experience'];
}

function Timeline({ items, locale, t, gold }: { items: ExperienceItem[]; locale: Locale; t: Dictionary['experience']; gold: boolean }) {
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.id}>
          <Reveal className={`tl-item ${gold ? 'gold' : ''}`}>
            <div className="tl-rail">
              <span className="node" />
            </div>
            <div className="tl-content">
              <div className="tl-date">
                {formatExperienceRange(item, locale, t)}
                {item.isCurrent && ` · ${t.current}`}
              </div>
              <div className="card tl-card">
                <div className="role-line">
                  <h3>{item.role}</h3>
                  {item.employmentType && <span className="etype">{item.employmentType}</span>}
                </div>
                <div className="org">
                  {item.organization}
                  {item.location && <span className="loc"> · {item.location}</span>}
                </div>
                {item.summary.length > 0 && (
                  <div className="blurb">
                    {item.summary.map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                )}
                {item.tags.length > 0 && (
                  <ul className="meta">
                    {item.tags.map((tag) => (
                      <li className="tag" key={tag}>
                        {tag}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </Reveal>
        </li>
      ))}
    </ol>
  );
}

export function Experience({ section, items, locale, t }: ExperienceProps) {
  const career = items.filter((i) => i.kind === 'career');
  const education = items.filter((i) => i.kind === 'education');

  return (
    <section id="experience" className="band" aria-labelledby="experience-title">
      <div className="wrap">
        <ExperienceTabs
          section={section}
          t={t}
          panels={{
            career: <Timeline items={career} locale={locale} t={t} gold={false} />,
            education: <Timeline items={education} locale={locale} t={t} gold />,
          }}
        />
      </div>
    </section>
  );
}

