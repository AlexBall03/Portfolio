const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://api.alexball.dev';

export async function sendContactMessage(payload, signal) {
  const res = await fetch(`${API_BASE}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // ignore — non-JSON error body
    }
    throw new Error(message);
  }

  return res.json();
}
