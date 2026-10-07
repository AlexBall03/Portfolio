import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { AdminUnavailable } from '@/components/admin/AdminUnavailable';
import { clerkAppearance } from '@/components/admin/clerk-appearance';
import { Background } from '@/components/layout/Background';
import { ADMIN_PATH, ADMIN_SIGN_IN_PATH } from '@/config/admin';
import { authStatus } from '@/config/env';
import { getSiteSettings } from '@/features/site/queries';
import { createLogger } from '@/lib/logger';
import { themeInitScript } from '@/lib/theme-script';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

const log = createLogger('admin');
let warnedUnconfigured = false;

/** One diagnosable line per server process, not one per render. */
function warnUnconfigured(reason: string) {
  if (warnedUnconfigured) return;
  warnedUnconfigured = true;
  log.warn('Admin authentication is not configured; admin access is disabled', { reason });
}

/**
 * Root layout of the private admin (a second root layout beside the public
 * `[locale]` one). English-only: it has one user. Nothing here authorizes;
 * the console layout and every admin operation call `requireAdmin()`.
 */

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s — Admin' },
  robots: { index: false, follow: false },
  icons: { icon: [{ url: '/favicon.ico', sizes: 'any' }] },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B0F14' },
    { media: '(prefers-color-scheme: light)', color: '#F5F3EE' },
  ],
};

export default async function AdminRootLayout({ children }: { children: ReactNode }) {
  const settings = await getSiteSettings();
  const auth = authStatus();
  if (!auth.configured) warnUnconfigured(auth.error);

  return (
    <html lang="en" data-theme={settings.defaultTheme} className={fontVariables} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(settings.defaultTheme) }} />
      </head>
      <body>
        <Background />
        {auth.configured ? (
          // Inside <body>, as Clerk requires with Cache Components.
          <ClerkProvider
            appearance={clerkAppearance}
            signInUrl={ADMIN_SIGN_IN_PATH}
            // There is no sign-up page; any stray sign-up link lands on sign-in.
            signUpUrl={ADMIN_SIGN_IN_PATH}
            signInFallbackRedirectUrl={ADMIN_PATH}
            afterSignOutUrl={ADMIN_SIGN_IN_PATH}
          >
            {children}
          </ClerkProvider>
        ) : (
          <AdminUnavailable detail={process.env.NODE_ENV === 'production' ? undefined : auth.error} />
        )}
      </body>
    </html>
  );
}
