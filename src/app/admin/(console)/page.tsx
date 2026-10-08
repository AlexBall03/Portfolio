import type { Metadata } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Stat, statDividers } from '@/components/ui/Stat';
import { Status } from '@/components/ui/Status';
import { Surface } from '@/components/ui/Surface';
import { ADMIN_CONFIGURATION_PATH, ADMIN_PROFILE_PATH } from '@/config/admin';
import { getContentOverview, getDeploymentOverview, getTranslationOverview } from '@/features/admin/overview';
import { cn } from '@/lib/cn';
import { getAdminProfile } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Dashboard' };

const ENVIRONMENT_LABEL = { production: 'Production', preview: 'Preview', development: 'Development' } as const;

const formatBuild = (iso: string) =>
  new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' }).format(new Date(iso)) +
  ' UTC';

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Surface as="section" variant="raised" radius="md" className={cn('flex flex-col', className)}>
      <h2 className="border-b border-line px-5 py-3.5 font-mono text-micro tracking-[0.16em] text-fg-muted uppercase">{title}</h2>
      <div className="px-5 py-4">{children}</div>
    </Surface>
  );
}

/** Label / value rows: dense, scannable, and copyable. */
function Facts({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 text-body-sm">
      {rows.map((row) => (
        <div key={row.label} className="col-span-2 grid grid-cols-subgrid border-b border-line py-2.5 last:border-b-0">
          <dt className="text-fg-muted">{row.label}</dt>
          <dd className="min-w-0 break-words text-fg">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const mono = (value: string) => <code className="font-mono text-label break-all">{value}</code>;

export default async function DashboardPage() {
  // Every console page authorizes itself too; this also returns the display identity.
  const profile = await getAdminProfile();
  const deployment = getDeploymentOverview();
  const [content, translations] = await Promise.all([getContentOverview(), getTranslationOverview()]);
  const spanish = translations.profile;

  const counts = [
    { label: 'Published projects', value: content.publishedProjects },
    { label: 'Skill categories', value: content.skillCategories },
    { label: 'Career entries', value: content.career },
    { label: 'Education entries', value: content.education },
  ];

  return (
    <>
      <AdminPageHeader
        eyebrow="Overview"
        title="Dashboard"
        lead={<>Signed in as <span className="text-fg">{profile.name}</span>. This is where alexball.dev&apos;s content is managed.</>}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Session">
          <Facts
            rows={[
              { label: 'Name', value: profile.name },
              ...(profile.email ? [{ label: 'Email', value: profile.email }] : []),
              { label: 'Clerk user', value: mono(profile.userId) },
              {
                label: 'Clerk instance',
                value: (
                  <Status tone={deployment.clerkInstance === 'production' ? 'success' : 'accent'}>
                    {ENVIRONMENT_LABEL[deployment.clerkInstance]}
                  </Status>
                ),
              },
            ]}
          />
        </Panel>

        <Panel title="Deployment">
          <Facts
            rows={[
              {
                label: 'Environment',
                value: (
                  <Status tone={deployment.environment === 'production' ? 'success' : 'accent'}>
                    {ENVIRONMENT_LABEL[deployment.environment]}
                  </Status>
                ),
              },
              ...(deployment.branch ? [{ label: 'Branch', value: mono(deployment.branch) }] : []),
              ...(deployment.commit ? [{ label: 'Commit', value: mono(deployment.commit) }] : []),
              ...(deployment.builtAt
                ? [{ label: 'Built', value: <time dateTime={deployment.builtAt}>{formatBuild(deployment.builtAt)}</time> }]
                : []),
              ...deployment.integrations.map((i) => ({
                label: i.label,
                value: <Status tone={i.configured ? 'success' : 'neutral'}>{i.configured ? 'Configured' : 'Not configured'}</Status>,
              })),
            ]}
          />
        </Panel>

        <Panel title="Site" className="md:col-span-2">
          <Facts
            rows={[
              {
                label: 'Profile',
                value: (
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <Link href={ADMIN_PROFILE_PATH} className="text-brand-fg underline-offset-4 hover:underline">
                      Details, roles, highlights, metrics
                    </Link>
                    <Status tone={spanish.complete === spanish.total ? 'success' : 'accent'}>
                      Spanish {spanish.complete}/{spanish.total}
                    </Status>
                    {spanish.partial > 0 && <span className="text-fg-muted">{spanish.partial} incomplete</span>}
                  </span>
                ),
              },
              {
                label: 'Configuration',
                value: (
                  <Link href={ADMIN_CONFIGURATION_PATH} className="text-brand-fg underline-offset-4 hover:underline">
                    Branding, GitHub, default theme
                  </Link>
                ),
              },
            ]}
          />
        </Panel>

        <Panel title="Published content" className="md:col-span-2">
          <dl className="grid grid-cols-2 lg:grid-cols-4">
            {counts.map((c, i) => (
              <Stat key={c.label} value={c.value} label={c.label} className={cn('px-1 py-3 sm:px-4', statDividers(i))} />
            ))}
          </dl>
          <p className="mt-4 border-t border-line pt-4 text-body-sm text-fg-muted">
            What the public site shows right now. Editing for projects, skills, experience, the resume, and page copy is
            coming to this console.
          </p>
        </Panel>
      </div>
    </>
  );
}
