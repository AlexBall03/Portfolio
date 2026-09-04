import { useEffect, useState } from 'react';
import ApiHeader from './components/ApiHeader';
import EndpointList from './components/EndpointList';
import ApiFooter from './components/ApiFooter';
import Api404 from './components/Api404';

export default function ApiPortalApp() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.title = 'Alex Ball API';
    document.querySelector('meta[name="description"]')?.setAttribute(
      'content',
      'Public API portal for alexball.dev — live GitHub profile and activity data.'
    );
    // The portal is served the portfolio's index.html, so it inherits the
    // build-time JSON-LD describing alexball.dev. That graph doesn't describe
    // this host, so drop it rather than let it be crawled here.
    document.getElementById('ld-site')?.remove();
  }, []);

  const isHome = path === '/';

  return (
    <div className="api-portal">
      <div className="wrap api-portal-wrap">
        <ApiHeader />
        <main>
          {isHome ? (
            <section className="endpoint-section">
              <h2 className="endpoint-section-title mono">Available Endpoints</h2>
              <EndpointList />
            </section>
          ) : (
            <Api404 />
          )}
        </main>
        <ApiFooter />
      </div>
    </div>
  );
}
