'use client';

import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_SIGN_IN_PATH } from '@/config/admin';

/**
 * Ends the Clerk session, then hard-navigates with `replace`: that drops the
 * client router cache and the history entry, so no admin UI can be shown
 * again from memory or with Back.
 */
function useSignOut() {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);
  const run = () => {
    setPending(true);
    void signOut(() => window.location.replace(ADMIN_SIGN_IN_PATH));
  };
  return [pending, run] as const;
}

export function SignOutButton({ className }: { className?: string }) {
  const [pending, signOut] = useSignOut();
  return (
    <button type="button" className={className} disabled={pending} aria-busy={pending || undefined} onClick={signOut}>
      <Icon name="logOut" />
      <span>{pending ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}

/** Account management is Clerk's own (profile, password, MFA, connected accounts). */
export function AccountButton({ className }: { className?: string }) {
  const { openUserProfile } = useClerk();
  return (
    <button type="button" className={className} onClick={() => openUserProfile()}>
      <Icon name="user" />
      <span>Account</span>
    </button>
  );
}
