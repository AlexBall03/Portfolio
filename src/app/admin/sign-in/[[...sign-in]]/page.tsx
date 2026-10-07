import { SignIn } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';
import { SignOutButton } from '@/components/admin/AccountActions';
import { BrandMark } from '@/components/layout/BrandMark';
import { buttonStyles } from '@/components/ui/button-styles';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { Surface } from '@/components/ui/Surface';
import { ADMIN_PATH, ADMIN_SIGN_IN_PATH } from '@/config/admin';
import { getSiteSettings } from '@/features/site/queries';
import { getAuthorization } from '@/server/auth/admin';

export const metadata: Metadata = { title: 'Sign in' };

/**
 * Sign-in for the existing admin account only. There is no sign-up route or
 * link: the account is provisioned in Clerk, and the instance is Invite-only.
 */
export default async function SignInPage() {
  const settings = await getSiteSettings();
  return (
    <main id="main" className="relative z-[1] flex flex-1 items-center justify-center px-4 py-12 sm:py-16">
      <div className="flex w-full max-w-[26rem] flex-col gap-8">
        <header className="flex flex-col items-center gap-4 text-center">
          <Link href="/" className="rounded-md text-h3">
            <BrandMark text={settings.brandMark} />
          </Link>
          <div className="flex flex-col items-center gap-2">
            <Eyebrow>Admin</Eyebrow>
            <h1 className="text-h2">Sign in</h1>
          </div>
        </header>

        <Surface variant="glass" className="p-6 sm:p-8">
          <Suspense fallback={<SignInPlaceholder />}>
            <SignInGate />
          </Suspense>
        </Surface>

        <Link href="/" className={buttonStyles({ variant: 'quiet', className: 'self-center' })}>
          <Icon name="arrowLeft" /> Back to the site
        </Link>
      </div>
    </main>
  );
}

async function SignInGate() {
  const authorization = await getAuthorization();
  if (authorization.status === 'admin') redirect(ADMIN_PATH);

  if (authorization.status === 'forbidden') {
    return (
      <div className="flex flex-col gap-5 text-center">
        <p className="text-body-sm text-fg-muted">
          You&apos;re signed in with an account that doesn&apos;t have access. Sign out to use a different account.
        </p>
        <SignOutButton className={buttonStyles({ variant: 'secondary', className: 'self-center' })} />
      </div>
    );
  }

  return <SignIn routing="path" path={ADMIN_SIGN_IN_PATH} fallbackRedirectUrl={ADMIN_PATH} withSignUp={false} />;
}

function SignInPlaceholder() {
  return (
    <div role="status" className="flex flex-col gap-3">
      <span className="sr-only">Loading sign-in…</span>
      <div aria-hidden="true" className="h-11 rounded-md bg-fg/[0.06] motion-safe:animate-pulse" />
      <div aria-hidden="true" className="h-11 rounded-md bg-fg/[0.06] motion-safe:animate-pulse" />
      <div aria-hidden="true" className="mt-3 h-11 rounded-md bg-fg/[0.06] motion-safe:animate-pulse" />
    </div>
  );
}
