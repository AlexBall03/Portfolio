import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { SectionTabs } from '@/components/admin/SectionTabs';
import { ADMIN_SKILLS_PATH } from '@/config/admin';

const TABS = [
  { key: 'categories', label: 'Categories', href: ADMIN_SKILLS_PATH },
  { key: 'technologies', label: 'Technologies', href: `${ADMIN_SKILLS_PATH}/technologies` },
] as const;

/** Header and sub-navigation for the Skills editors (each tab is its own form and save). */
export function SkillsPageHeader({ current }: { current: (typeof TABS)[number]['key'] }) {
  return (
    <>
      <AdminPageHeader
        eyebrow="Content"
        title="Skills"
        lead="The technology stack on the About page. Hidden categories stay here but aren't shown."
      />
      <SectionTabs label="Skills sections" tabs={TABS} current={current} />
    </>
  );
}
