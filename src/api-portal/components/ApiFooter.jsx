import { PORTAL_META } from '../portalData';

export default function ApiFooter() {
  return (
    <footer className="api-footer">
      <span className="mono">React · Vite · Vercel</span>
      <div className="api-footer-links">
        <a href={PORTAL_META.portfolioUrl}>alexball.dev</a>
        <a href={PORTAL_META.githubUrl} target="_blank" rel="noreferrer">GitHub</a>
      </div>
    </footer>
  );
}
