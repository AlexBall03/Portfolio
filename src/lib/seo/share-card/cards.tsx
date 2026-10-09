/**
 * Share card layouts (1200×630), rendered by `next/og` (Satori): flexbox and
 * inline styles only, no oklch(), no backdrop-filter. They restate the site's
 * design — editorial type, grid atmosphere, blue/brass glows, glass frames —
 * in what the renderer supports. Every text input is pre-clipped by the caller.
 */
import type { CSSProperties, ReactNode } from 'react';
import { initials } from '@/features/profile/display-name';
import { C, oklchHex, withAlpha } from './palette';

const DISPLAY = 'Space Grotesk';
const MONO = 'JetBrains Mono';
const PAD = 64;
/** Satori has no `inset` shorthand. */
const FILL = { top: 0, right: 0, bottom: 0, left: 0 } as const;

/**
 * Space Grotesk's tt/ft ligatures render narrower than Satori measures them,
 * leaving a gap after the word. A zero-width non-joiner between the pair
 * keeps the plain glyphs. Apply to every display-face string.
 */
const ZWNJ = String.fromCharCode(0x200c);
const unlig = (text: string) => text.replace(/([ft])(?=[ft])/g, `$1${ZWNJ}`);

/**
 * Font size by text length: the first step whose length limit fits, else the
 * smallest size. Typical copy keeps the large size; longer copy steps down and
 * wraps instead of being cut.
 */
const sizeFor = (length: number, steps: readonly [maxLength: number, size: number][], smallest: number) =>
  steps.find(([max]) => length <= max)?.[1] ?? smallest;


/* ── Shared pieces ─────────────────────────────────────────────────────── */

function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        background: C.canvas,
        color: C.fg,
        fontFamily: 'Inter',
        overflow: 'hidden',
      }}
    >
      {/* Atmosphere: grid, faded toward the edges, and the two ambient glows. */}
      <div
        style={{
          position: 'absolute',
          ...FILL,
          backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
          backgroundSize: '44px 44px',
        }}
      />
      <div
        style={{
          position: 'absolute',
          ...FILL,
          backgroundImage: `radial-gradient(120% 95% at 30% 25%, transparent 35%, ${C.canvas} 90%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: -330,
          left: -260,
          width: 900,
          height: 760,
          backgroundImage: `radial-gradient(circle, ${C.brandGlow} 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: -360,
          right: -240,
          width: 820,
          height: 700,
          backgroundImage: `radial-gradient(circle, ${C.accentGlow} 0%, transparent 70%)`,
        }}
      />
      {/* Hairline sheen along the top edge. */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          backgroundImage: `linear-gradient(90deg, transparent, ${withAlpha(C.brand, 0.7)} 30%, ${withAlpha(C.accent, 0.5)} 70%, transparent)`,
        }}
      />
      <div style={{ position: 'absolute', ...FILL, display: 'flex', padding: PAD }}>{children}</div>
    </div>
  );
}

/** The site wordmark (`</Alex-Ball\>`): brackets in brand blue, dashes in brass, like `BrandMark`. */
function Wordmark({ text, size }: { text: string; size: number }) {
  const parts = text.split(/(<\/|\\>|-)/).filter(Boolean);
  return (
    <div style={{ display: 'flex', fontFamily: MONO, fontSize: size, letterSpacing: -0.4, color: C.fg }}>
      {parts.map((part, i) => (
        <span
          key={i}
          style={{ color: part === '</' || part === '\\>' ? C.brandFg : part === '-' ? C.accentFg : C.fg }}
        >
          {part}
        </span>
      ))}
    </div>
  );
}

/** Availability pill, like `Status tone="success"`. */
function StatusPill({ children }: { children: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        alignSelf: 'flex-start',
        maxWidth: '100%',
        gap: 12,
        padding: '8px 16px',
        borderRadius: 999,
        border: `1px solid ${withAlpha(C.success, 0.32)}`,
        background: withAlpha(C.success, 0.1),
        color: C.success,
        fontFamily: MONO,
        fontSize: sizeFor(children.length, [[48, 15]], 13),
        lineHeight: 1.35,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: C.success,
          boxShadow: `0 0 0 4px ${withAlpha(C.success, 0.2)}`,
        }}
      />
      {children}
    </div>
  );
}

/** Mono eyebrow with a leading index and a trailing rule. */
function Eyebrow({ index, label }: { index?: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontFamily: MONO, fontSize: 17, letterSpacing: 2.4 }}>
      {index && <span style={{ color: C.accentFg }}>{index}</span>}
      {index && <span style={{ color: C.fgFaint }}>/</span>}
      <span style={{ color: C.fgMuted, textTransform: 'uppercase' }}>{label}</span>
      <div style={{ width: 96, height: 1, backgroundImage: `linear-gradient(90deg, ${withAlpha(C.accent, 0.6)}, transparent)` }} />
    </div>
  );
}

/** A glass surface: translucent fill, hairline edge, top highlight, deep shadow. */
function Glass({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        borderRadius: 26,
        border: `1px solid ${C.glassEdge}`,
        background: C.glassFill,
        backgroundImage: 'linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0) 40%)',
        boxShadow: '0 30px 70px -30px rgba(0,0,0,0.85), 0 2px 6px -2px rgba(0,0,0,0.3)',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** L-shaped registration marks on a frame's corners: blue top-left, brass bottom-right. */
function Corners() {
  const mark: CSSProperties = { position: 'absolute', width: 18, height: 18 };
  return (
    <>
      <div style={{ ...mark, top: -7, left: -7, borderTop: `2px solid ${withAlpha(C.brand, 0.85)}`, borderLeft: `2px solid ${withAlpha(C.brand, 0.85)}` }} />
      <div style={{ ...mark, bottom: -7, right: -7, borderBottom: `2px solid ${withAlpha(C.accent, 0.8)}`, borderRight: `2px solid ${withAlpha(C.accent, 0.8)}` }} />
    </>
  );
}

function Tag({ children }: { children: string }) {
  return (
    <div
      style={{
        display: 'flex',
        padding: '7px 14px',
        borderRadius: 999,
        border: `1px solid ${C.lineStrong}`,
        background: 'rgba(255,255,255,0.04)',
        color: C.fgMuted,
        fontFamily: MONO,
        fontSize: 16,
      }}
    >
      {children}
    </div>
  );
}

/** Identity art, the designed no-image state (projects, a missing headshot): hue + brass corner + grid + initials. */
function IdentityArt({ hue, name, width, height }: { hue: number; name: string; width: number; height: number }) {
  const tint = oklchHex(0.6, 0.16, hue);
  const letters = initials(name);
  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 18,
        overflow: 'hidden',
        background: C.surfaceInset,
      }}
    >
      <div style={{ position: 'absolute', ...FILL, backgroundImage: `radial-gradient(110% 90% at 0% 0%, ${withAlpha(tint, 0.42)}, transparent 62%)` }} />
      <div style={{ position: 'absolute', ...FILL, backgroundImage: `radial-gradient(80% 70% at 100% 100%, ${withAlpha(C.accent, 0.16)}, transparent 70%)` }} />
      <div
        style={{
          position: 'absolute',
          ...FILL,
          backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
          backgroundSize: '28px 28px',
        }}
      />
      <div style={{ display: 'flex', fontFamily: DISPLAY, fontWeight: 600, fontSize: Math.round(Math.min(width, height) * 0.38), letterSpacing: -4, color: withAlpha(C.fg, 0.9) }}>
        {letters}
      </div>
    </div>
  );
}

/* ── Home ──────────────────────────────────────────────────────────────── */

export interface HomeCardProps {
  name: [string, string];
  title: string;
  statement: string;
  availability: string | null;
  meta: { label: string; value: string }[];
  headshot: string | null;
  chips: string;
  monogram: string;
  fullName: string;
}

export function HomeCard(p: HomeCardProps) {
  const nameSize = sizeFor(Math.max(p.name[0].length, p.name[1].length), [[11, 96], [14, 80]], 66);
  const statementSize = sizeFor(p.statement.length, [[110, 23], [170, 20]], 18);
  const metaSize = p.meta.some((m) => m.value.length > 24) ? 16 : 18;
  return (
    <Frame>
      <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 64 }}>
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
          {p.availability && <StatusPill>{p.availability}</StatusPill>}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: p.availability ? 26 : 0,
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: nameSize,
              lineHeight: 0.98,
              letterSpacing: -3,
            }}
          >
            <span>{unlig(p.name[0])}</span>
            {p.name[1] && <span style={{ color: withAlpha(C.fg, 0.85) }}>{unlig(p.name[1])}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 22 }}>
            <span style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: sizeFor(p.title.length, [[28, 32]], 26), color: C.brandFg }}>
              {unlig(p.title)}
            </span>
            <div style={{ width: 120, height: 1, backgroundImage: `linear-gradient(90deg, ${withAlpha(C.brand, 0.7)}, transparent)` }} />
          </div>
          <div style={{ display: 'flex', marginTop: 20, fontSize: statementSize, lineHeight: 1.45, color: C.fgMuted }}>{p.statement}</div>
          <div style={{ display: 'flex', gap: 28, marginTop: 28, paddingTop: 20, borderTop: `1px solid ${C.line}` }}>
            {p.meta.map((m) => (
              <div
                key={m.label}
                style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: Math.max(m.value.length, m.label.length), flexBasis: 0, minWidth: 0 }}
              >
                <span style={{ fontFamily: MONO, fontSize: 13, letterSpacing: 2, color: C.fgFaint, textTransform: 'uppercase' }}>{m.label}</span>
                <span style={{ fontSize: metaSize, lineHeight: 1.3, fontWeight: 500, color: C.fg }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              top: -60,
              left: -60,
              right: -60,
              bottom: -60,
              borderRadius: 999,
              backgroundImage: `radial-gradient(circle, ${withAlpha(C.brand, 0.28)} 0%, transparent 70%)`,
            }}
          />
          <Glass style={{ flexDirection: 'column', padding: 11 }}>
            <Corners />
            {p.headshot ? (
              <div style={{ display: 'flex', width: 334, height: 392, borderRadius: 18, overflow: 'hidden', background: C.surfaceInset }}>
                {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori renders plain <img>; the card itself carries the alt. */}
                <img src={p.headshot} width={334} height={392} style={{ objectFit: 'cover', objectPosition: '50% 18%' }} />
              </div>
            ) : (
              <IdentityArt hue={259} name={p.fullName} width={334} height={392} />
            )}
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, width: 334, padding: '14px 10px 4px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1, minWidth: 0 }}>
                <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 20 }}>{unlig(p.fullName)}</span>
                {p.chips && <span style={{ fontFamily: MONO, fontSize: 13, lineHeight: 1.4, color: C.fgFaint }}>{p.chips}</span>}
              </div>
              <Wordmark text={p.monogram} size={16} />
            </div>
          </Glass>
        </div>
      </div>
    </Frame>
  );
}

/* ── Top-level page ────────────────────────────────────────────────────── */

export interface PageCardProps {
  index: string;
  label: string;
  title: string;
  description: string;
  brandMark: string;
  domain: string;
  fullName: string;
  role: string;
  availability: string | null;
  headshot: string | null;
}

export function PageCard(p: PageCardProps) {
  const titleSize = sizeFor(p.title.length, [[22, 84], [40, 68]], 56);
  const descriptionSize = sizeFor(p.description.length, [[120, 27], [180, 23]], 20);
  return (
    <Frame>
      {/* Oversized index numeral, the page's place in the site. */}
      <div
        style={{
          position: 'absolute',
          right: 40,
          top: 84,
          display: 'flex',
          fontFamily: DISPLAY,
          fontWeight: 600,
          fontSize: 340,
          letterSpacing: -16,
          lineHeight: 1,
          color: 'rgba(255,255,255,0.035)',
        }}
      >
        {p.index}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark text={p.brandMark} size={24} />
          <span style={{ fontFamily: MONO, fontSize: 18, color: C.fgFaint }}>{p.domain}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'center', maxWidth: 940 }}>
          <Eyebrow index={p.index} label={p.label} />
          <div
            style={{
              display: 'flex',
              marginTop: 22,
              fontFamily: DISPLAY,
              fontWeight: 600,
              fontSize: titleSize,
              lineHeight: 1.04,
              letterSpacing: -2.6,
            }}
          >
            {unlig(p.title)}
          </div>
          <div style={{ display: 'flex', marginTop: 22, fontSize: descriptionSize, lineHeight: 1.45, color: C.fgMuted, maxWidth: 880 }}>
            {p.description}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: 24,
            borderTop: `1px solid ${C.line}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div
              style={{
                display: 'flex',
                width: 58,
                height: 58,
                borderRadius: 999,
                overflow: 'hidden',
                border: `1px solid ${C.glassEdge}`,
                background: C.surfaceInset,
              }}
            >
              {p.headshot ? (
                // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori renders plain <img>; the card itself carries the alt.
                <img src={p.headshot} width={58} height={58} style={{ objectFit: 'cover', objectPosition: '50% 18%' }} />
              ) : (
                <div
                  style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', fontFamily: DISPLAY, fontWeight: 600, fontSize: 22, color: C.brandFg }}
                >
                  {initials(p.fullName)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 460 }}>
              <span style={{ fontFamily: DISPLAY, fontWeight: 600, fontSize: 23 }}>{unlig(p.fullName)}</span>
              <span style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 18, color: C.brandFg }}>{unlig(p.role)}</span>
            </div>
          </div>
          {p.availability && <StatusPill>{p.availability}</StatusPill>}
        </div>
      </div>
    </Frame>
  );
}

/* ── Project ───────────────────────────────────────────────────────────── */

export interface ProjectCardProps {
  label: string;
  name: string;
  tagline: string;
  technologies: string[];
  cover: string | null;
  hue: number;
  live: string | null;
  brandMark: string;
  domain: string;
}

export function ProjectCard(p: ProjectCardProps) {
  const art = { width: 456, height: 342 };
  const nameSize = sizeFor(p.name.length, [[14, 76], [26, 62]], 50);
  const taglineSize = sizeFor(p.tagline.length, [[90, 25], [150, 22]], 19);
  return (
    <Frame>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Wordmark text={p.brandMark} size={24} />
          <span style={{ fontFamily: MONO, fontSize: 18, color: C.fgFaint }}>{p.domain}</span>
        </div>

        <div style={{ display: 'flex', flex: 1, alignItems: 'center', gap: 56 }}>
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <Eyebrow label={p.label} />
              {p.live && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 15, color: C.success, textTransform: 'uppercase', letterSpacing: 1 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 999, background: C.success }} />
                  {p.live}
                </div>
              )}
            </div>
            <div
              style={{
                display: 'flex',
                marginTop: 20,
                fontFamily: DISPLAY,
                fontWeight: 600,
                fontSize: nameSize,
                lineHeight: 1.02,
                letterSpacing: -2.4,
              }}
            >
              {unlig(p.name)}
            </div>
            <div style={{ display: 'flex', marginTop: 20, fontSize: taglineSize, lineHeight: 1.42, color: C.fgMuted }}>{p.tagline}</div>
            {p.technologies.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 28 }}>
                {p.technologies.map((t) => (
                  <Tag key={t}>{t}</Tag>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', position: 'relative' }}>
            <div
              style={{
                position: 'absolute',
                top: -50,
                left: -50,
                right: -50,
                bottom: -50,
                borderRadius: 999,
                backgroundImage: `radial-gradient(circle, ${withAlpha(oklchHex(0.6, 0.16, p.hue), 0.3)} 0%, transparent 70%)`,
              }}
            />
            <Glass style={{ padding: 11 }}>
              <Corners />
              {p.cover ? (
                <div style={{ display: 'flex', ...art, borderRadius: 18, overflow: 'hidden', background: C.surfaceInset }}>
                  {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- Satori renders plain <img>; the card itself carries the alt. */}
                  <img src={p.cover} {...art} style={{ objectFit: 'cover' }} />
                </div>
              ) : (
                <IdentityArt hue={p.hue} name={p.name} {...art} />
              )}
            </Glass>
          </div>
        </div>
      </div>
    </Frame>
  );
}
