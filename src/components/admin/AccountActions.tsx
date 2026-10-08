'use client';

import { useClerk } from '@clerk/nextjs';
import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { ADMIN_SIGN_IN_PATH } from '@/config/admin';

interface ActionProps {
  className?: string;
  /** Icon only; the label becomes the accessible name and tooltip. */
  iconOnly?: boolean;
}

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

export function SignOutButton({ className, iconOnly }: ActionProps) {
  const [pending, signOut] = useSignOut();
  const label = pending ? 'Signing out…' : 'Sign out';
  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      aria-busy={pending || undefined}
      onClick={signOut}
      {...(iconOnly && { 'aria-label': label, title: label })}
    >
      <Icon name="logOut" />
      {!iconOnly && <span>{label}</span>}
    </button>
  );
}

/** Account management is Clerk's own (profile, password, MFA, connected accounts). */
export function AccountButton({ className, iconOnly }: ActionProps) {
  const { openUserProfile } = useClerk();
  return (
    <button
      type="button"
      className={className}
      onClick={() => openUserProfile()}
      {...(iconOnly && { 'aria-label': 'Manage account', title: 'Manage account' })}
    >
      <Icon name="shield" />
      {!iconOnly && <span>Account</span>}
    </button>
  );
}
