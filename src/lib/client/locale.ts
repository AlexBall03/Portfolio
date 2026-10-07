'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { LOCALE_COOKIE, type Locale } from '@/i18n/config';
import { localizedPath, splitLocale } from '@/i18n/paths';

/** Switches language, keeping the visitor on the equivalent page. */
export function useSwitchLocale() {
  const router = useRouter();
  const pathname = usePathname();
  return useCallback(
    (target: Locale) => {
      // Remembered so unprefixed links (e.g. alexball.dev/about) honor the choice.
      document.cookie = `${LOCALE_COOKIE}=${target}; path=/; max-age=31536000; samesite=lax`;
      router.push(localizedPath(target, splitLocale(pathname).path));
    },
    [router, pathname],
  );
}

/** The current page's locale-less path, e.g. "/es/about" → "/about". */
export function useLocalelessPath(): string {
  return splitLocale(usePathname()).path;
}
