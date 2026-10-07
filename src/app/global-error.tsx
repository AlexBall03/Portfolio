'use client';

/**
 * Last-resort boundary for errors thrown by the root layout itself. The
 * stylesheet and fonts may not have loaded, so it is styled inline with the
 * design system's dark canvas values.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          fontFamily: 'system-ui, sans-serif',
          background: 'oklch(0.158 0.012 252)',
          color: 'oklch(0.79 0.014 250)',
          textAlign: 'center',
        }}
      >
        <main>
          <h1 style={{ margin: 0, color: 'oklch(0.968 0.004 250)', fontSize: '2rem', letterSpacing: '-0.03em' }}>
            Something went wrong
          </h1>
          <p style={{ margin: '12px 0 0' }}>An unexpected error occurred. Please try again.</p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '12px 20px',
              border: 0,
              borderRadius: 12,
              background: 'oklch(0.55 0.2 259)',
              color: '#fff',
              font: 'inherit',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
