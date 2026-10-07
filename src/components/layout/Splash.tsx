import { Background } from './Background';
import { BrandMark } from './BrandMark';

/**
 * First-visit loading screen. Server-rendered but hidden unless the inline
 * boot script (src/lib/splash-script.ts) turns it on, so no-JS visitors and
 * crawlers never see it. Progress and the percentage are driven by the
 * `--boot` property on <html>; nothing here re-renders.
 */
export function Splash({ text, label }: { text: string; label: string }) {
  return (
    <div id="splash" aria-hidden="true">
      <Background />
      <div className="splash-body">
        <div className="splash-core">
          <span className="splash-halo" />
          <span className="splash-halo splash-halo-accent" />
          <BrandMark text={text} className="splash-mark" />
        </div>
        <div className="splash-track">
          <div className="splash-fill" />
        </div>
        <p className="splash-label">
          <span>{label}</span>
          <span className="text-fg-faint">·</span>
          <span className="splash-pct" />
        </p>
      </div>
    </div>
  );
}
