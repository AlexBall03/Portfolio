import { PORTAL_META } from '../portalData';

export default function Api404() {
  return (
    <div className="card api-404">
      <span className="mono api-404-code">404</span>
      <h2>Endpoint not found</h2>
      <p className="endpoint-desc">This path doesn't correspond to a route on the Alex Ball API.</p>
      <div className="api-404-links">
        <a className="btn btn-ghost btn-sm" href="/">View available endpoints</a>
        <a className="btn btn-ghost btn-sm" href={PORTAL_META.portfolioUrl}>Back to alexball.dev</a>
      </div>
    </div>
  );
}
