'use client';

/** Last-resort boundary for errors thrown by the root layout itself. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#0B0F14', color: '#D1D5DB', padding: 48 }}>
        <h1 style={{ color: '#fff' }}>Something went wrong</h1>
        <p>An unexpected error occurred. Please try again.</p>
        <button type="button" onClick={reset} style={{ marginTop: 16, padding: '8px 16px' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
