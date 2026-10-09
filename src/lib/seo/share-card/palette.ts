/**
 * Share card colors: the dark theme's tokens (styles/tokens.css), converted to
 * hex because the card renderer (Satori) doesn't parse oklch(). Keep the
 * L/C/H values in step with the tokens they name.
 */

/** OKLCH → sRGB hex (gamut-clipped). */
export function oklchHex(l: number, c: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ];
  const channel = (x: number) => {
    const v = Math.min(1, Math.max(0, x));
    const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
    return Math.round(srgb * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${linear.map(channel).join('')}`;
}

/** A #rrggbb color at the given opacity, as #rrggbbaa. */
export function withAlpha(hex: string, alpha: number): string {
  return `${hex}${Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0')}`;
}

export const C = {
  canvas: oklchHex(0.158, 0.012, 252),
  surface: oklchHex(0.198, 0.014, 252),
  surfaceInset: oklchHex(0.138, 0.011, 252),
  fg: oklchHex(0.968, 0.004, 250),
  fgMuted: oklchHex(0.79, 0.014, 250),
  fgFaint: oklchHex(0.64, 0.018, 250),
  brand: oklchHex(0.55, 0.2, 259),
  brandFg: oklchHex(0.77, 0.12, 256),
  accent: oklchHex(0.77, 0.13, 86),
  accentFg: oklchHex(0.83, 0.11, 88),
  success: oklchHex(0.78, 0.15, 155),
  /* Translucent roles, as rgba so they composite over the atmosphere. */
  line: 'rgba(255,255,255,0.08)',
  lineStrong: 'rgba(255,255,255,0.15)',
  glassEdge: 'rgba(255,255,255,0.16)',
  glassFill: 'rgba(28,34,43,0.72)',
  grid: 'rgba(255,255,255,0.045)',
  brandGlow: 'rgba(47,123,239,0.30)',
  accentGlow: 'rgba(217,174,69,0.13)',
} as const;
