import { PORTAL_META } from '../portalData';
import ApiStatus from './ApiStatus';

export default function ApiHeader() {
  return (
    <header className="api-header">
      <div className="api-header-top">
        <a className="api-wordmark mono" href="/">
          &lt;/Alex-Ball&gt; <span className="api-version">{PORTAL_META.version}</span>
        </a>
        <a className="btn btn-ghost btn-sm" href={PORTAL_META.portfolioUrl}>
          Back to alexball.dev
        </a>
      </div>
      <h1 className="api-title">Alex Ball API</h1>
      <p className="api-sub">APIs and data services powering alexball.dev.</p>
      <ApiStatus />
    </header>
  );
}
