import { Icon } from '@/components/ui/Icon';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHead } from '@/components/ui/SectionHead';
import type { SectionContent } from '@/features/site/types';
import type { Highlight, Profile, ProfileRole } from '../types';
import { RoleCycler } from './RoleCycler';

interface AboutProps {
  section: SectionContent;
  profile: Profile;
  roles: ProfileRole[];
  differentiators: Highlight[];
}

export function About({ section, profile, roles, differentiators }: AboutProps) {
  return (
    <section id="about" className="band" aria-labelledby="about-title">
      <div className="wrap">
        <SectionHead index="02" content={section} id="about-title" />
        <div className="about-grid">
          <Reveal className="about-left">
            {roles.length > 0 && <RoleCycler roles={roles} />}
            <div className="about-body">
              {profile.about.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </Reveal>

          <Reveal delay={120} className="diff-list">
            {differentiators.map((d) => (
              <div className="card diff" key={d.title}>
                <span className="di">{d.icon && <Icon name={d.icon} />}</span>
                <div>
                  <h3 className="dt">{d.title}</h3>
                  <p className="dd">{d.body}</p>
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
