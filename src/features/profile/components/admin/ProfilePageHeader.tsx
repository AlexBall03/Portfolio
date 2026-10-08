import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Icon } from '@/components/ui/Icon';
import { buttonStyles } from '@/components/ui/button-styles';
import { ProfileTabs, type ProfileTab } from './ProfileTabs';

/** Shared header for the Profile editors: title, a link to the public page, and the section tabs. */
export function ProfilePageHeader({ current }: { current: ProfileTab }) {
  return (
    <>
      <AdminPageHeader
        eyebrow="Site"
        title="Profile"
        lead="Who the site is about: identity, headline and About copy, and the lists around them. Saving updates the public site immediately."
        actions={
          <a href="/about" target="_blank" rel="noreferrer" className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
            View About page
            <Icon name="arrowUpRight" />
          </a>
        }
      />
      <ProfileTabs current={current} />
    </>
  );
}
