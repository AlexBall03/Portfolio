import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Status } from '@/components/ui/Status';
import { ADMIN_CONTENT_PATH, ADMIN_PROFILE_PATH, ADMIN_SOCIAL_LINKS_PATH } from '@/config/admin';
import { contactEnv } from '@/config/env';
import { loadProfileDetails, loadSocialLinks } from '@/features/profile/service';
import { ContactCopyEditor } from '@/features/site/components/admin/ContactCopyEditor';
import { loadContactCopy } from '@/features/site/service';
import { requireAdmin } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Contact' };

const link = (href: string, label: string) => (
  <Link href={href} className="text-brand-fg underline-offset-4 hover:underline">
    {label}
  </Link>
);

function formConfigured() {
  try {
    contactEnv();
    return true;
  } catch {
    return false;
  }
}

export default async function ContactAdminPage() {
  await requireAdmin();
  const [initial, profile, socials] = await Promise.all([loadContactCopy(), loadProfileDetails(), loadSocialLinks()]);
  const visible = socials.filter((s) => s.visible).length;
  const configured = formConfigured();

  const facts: { label: string; value: ReactNode }[] = [
    { label: 'Public email', value: <>{profile.email} · {link(ADMIN_PROFILE_PATH, 'Edit in Profile')}</> },
    {
      label: 'Links',
      value: <>{visible} visible · {link(ADMIN_SOCIAL_LINKS_PATH, 'Edit social links')}</>,
    },
    {
      label: 'Contact form',
      value: (
        <Status tone={configured ? 'success' : 'neutral'}>{configured ? 'Sending via Resend' : 'Not configured'}</Status>
      ),
    },
    { label: 'Search and sharing', value: link(`${ADMIN_CONTENT_PATH}/contact`, 'Edit in Page content') },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Site"
        title="Contact"
        lead="The contact page's heading and introduction. The form's labels and messages are part of the site interface."
      />
      <dl className="grid grid-cols-[minmax(8rem,auto)_1fr] gap-x-6 border-b border-line text-body-sm">
        {facts.map((f) => (
          <div key={f.label} className="col-span-2 grid grid-cols-subgrid border-t border-line py-2.5">
            <dt className="text-fg-muted">{f.label}</dt>
            <dd className="min-w-0 break-words text-fg">{f.value}</dd>
          </div>
        ))}
      </dl>
      <ContactCopyEditor initial={initial} />
    </>
  );
}
