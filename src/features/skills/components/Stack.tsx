import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHead } from '@/components/ui/SectionHead';
import type { SectionContent } from '@/features/site/types';
import type { Dictionary } from '@/i18n/get-dictionary';
import type { SkillsOverview } from '../types';

interface StackProps {
  section: SectionContent;
  skills: SkillsOverview;
  t: Dictionary['stack'];
}

export function Stack({ section, skills, t }: StackProps) {
  return (
    <section id="stack" className="band" aria-labelledby="stack-title">
      <div className="wrap">
        <SectionHead index="03" content={section} id="stack-title" />
        <div className="stack-grid">
          {skills.stack.map((cat, i) => (
            <Reveal className={`card stack-cat ${cat.accent === 'gold' ? 'gold' : ''}`} key={cat.slug} delay={i * 80}>
              <div className="cat-h">
                <span className="ci">
                  <Icon name={cat.icon} />
                </span>
                <h3 className="tt">{cat.name}</h3>
              </div>
              <ul className="stack-skills">
                {cat.technologies.map((s) => (
                  <li className="skill-pill" key={s.slug}>
                    {s.name}
                  </li>
                ))}
              </ul>
            </Reveal>
          ))}
        </div>

        {skills.learning.map((cat) => (
          <Reveal className="card learning-banner" key={cat.slug}>
            <div className="lb-l">
              <span className="lb-ic">
                <Icon name={cat.icon} />
              </span>
              <div>
                <div className="lb-k">{t.lookingAhead}</div>
                <h3 className="lb-v">{cat.name}</h3>
              </div>
            </div>
            <ul className="lb-tags">
              {cat.technologies.map((s) => (
                <li className="tag" key={s.slug}>
                  {s.name}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
