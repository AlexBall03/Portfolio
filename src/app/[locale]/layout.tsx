import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata, Viewport } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import type { ReactNode } from 'react';
import { BackToTop } from '@/components/layout/BackToTop';
import { Background } from '@/components/layout/Background';
import { getChromeData } from '@/components/layout/chrome-data';
import { Footer } from '@/components/layout/Footer';
import { NavigationProgress } from '@/components/layout/NavigationProgress';
import { SiteChrome } from '@/components/layout/SiteChrome';
import { Splash } from '@/components/layout/Splash';
import { JsonLd } from '@/components/ui/JsonLd';
import { GOOGLE_ANALYTICS_ID, SITE_URL } from '@/config/site';
import { getExperiences } from '@/features/experience/queries';
import { getProfile, getSocialLinks } from '@/features/profile/queries';
import { getSiteSettings } from '@/features/site/queries';
import { getSkills } from '@/features/skills/queries';
import { isLocale, LOCALES } from '@/i18n/config';
import { getDictionary } from '@/i18n/get-dictionary';
import { buildSiteGraph } from '@/lib/seo/structured-data';
import { splashInitScript } from '@/lib/splash-script';
import { themeInitScript } from '@/lib/theme-script';
import { fontVariables } from '@/styles/fonts';
import '@/styles/globals.css';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0B0F14' },
    { media: '(prefers-color-scheme: light)', color: '#F5F3EE' },
  ],
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const profile = await getProfile(locale);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: `${profile.fullName} — ${profile.title}`, template: `%s — ${profile.fullName}` },
    description: profile.statement,
    applicationName: profile.fullName,
    authors: [{ name: profile.fullName, url: SITE_URL }],
    creator: profile.fullName,
    openGraph: { siteName: profile.fullName },
    icons: {
      icon: [
        { url: '/favicon.ico', sizes: 'any' },
        { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
        { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      ],
      apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    },
  };
}

export default async function LocaleLayout({ children, params }: LayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const dict = getDictionary(locale);
  const [settings, chrome, profile, socials, experiences, skills] = await Promise.all([
    getSiteSettings(),
    getChromeData(locale),
    getProfile(locale),
    getSocialLinks(),
    getExperiences(locale),
    getSkills(locale),
  ]);

  return (
    <html
      lang={locale}
      data-theme={settings.defaultTheme}
      className={fontVariables}
      // The inline script below may change data-theme before hydration.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript(settings.defaultTheme) }} />
        <script dangerouslySetInnerHTML={{ __html: splashInitScript() }} />
      </head>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-md focus:bg-brand focus:px-4 focus:py-2 focus:text-on-brand"
        >
          {dict.nav.skipToContent}
        </a>
        <Splash text={settings.brandMark} label={dict.loading.label} />
        <Background />
        <NavigationProgress />
        <SiteChrome data={chrome} />
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <Footer data={chrome} ownerName={profile.fullName} statement={profile.statement} />
        <BackToTop label={dict.nav.backToTop} />
        <JsonLd data={buildSiteGraph({ profile, socials, experiences, skills })} />
        <Analytics />
        <SpeedInsights />
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`} strategy="afterInteractive" />
        <Script id="ga-init" strategy="afterInteractive">
          {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GOOGLE_ANALYTICS_ID}');`}
        </Script>
      </body>
    </html>
  );
}
