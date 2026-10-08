import type { ClerkProvider } from '@clerk/nextjs';
import type { ComponentProps } from 'react';

type Appearance = NonNullable<ComponentProps<typeof ClerkProvider>['appearance']>;

/**
 * Clerk's components dressed in the design system. Variables point at the
 * semantic tokens, so both themes follow `<html data-theme>` with no JS.
 * Clerk's CSS sits in the `clerk` layer (declared in globals.css), below
 * Tailwind utilities, so the classes in `elements` win.
 */
export const clerkAppearance: Appearance = {
  cssLayerName: 'clerk',
  variables: {
    colorPrimary: 'var(--brand)',
    colorPrimaryForeground: 'var(--on-brand)',
    colorDanger: 'var(--danger)',
    colorSuccess: 'var(--success)',
    colorWarning: 'var(--warning)',
    colorNeutral: 'var(--fg)',
    colorForeground: 'var(--fg)',
    colorMutedForeground: 'var(--fg-muted)',
    colorMuted: 'var(--surface-inset)',
    colorBackground: 'var(--surface-raised)',
    colorInput: 'var(--surface-inset)',
    colorInputForeground: 'var(--fg)',
    colorBorder: 'var(--line-strong)',
    colorRing: 'var(--focus)',
    colorModalBackdrop: 'var(--scrim)',
    fontFamily: 'var(--font-inter), system-ui, sans-serif',
    fontFamilyButtons: 'var(--font-inter), system-ui, sans-serif',
    fontFamilyMono: 'var(--font-jetbrains-mono), ui-monospace, monospace',
    borderRadius: '0.625rem',
  },
  options: {
    socialButtonsVariant: 'blockButton',
    socialButtonsPlacement: 'top',
    logoPlacement: 'none',
  },
  signIn: {
    options: { elevation: 'flush' },
    elements: {
      // The page supplies the card (a glass Surface) and the heading.
      rootBox: 'w-full',
      cardBox: 'w-full max-w-none border-0 bg-transparent shadow-none',
      card: 'bg-transparent p-0 shadow-none',
      header: 'hidden',
      // No sign-up, anywhere: accounts are provisioned in Clerk only.
      footerAction: 'hidden',
      footer: 'bg-transparent',
      // Clerk hangs "Last used" off the button's top-right corner; sit it
      // inside the button instead, vertically centered at the trailing edge.
      lastAuthenticationStrategyBadge:
        'top-1/2 right-3 inline-flex -translate-y-1/2 transform-none items-center leading-none rtl:right-auto rtl:left-3 rtl:transform-none',
    },
  },
};
