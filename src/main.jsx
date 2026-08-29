import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/styles.css';
import './styles/bg.css';
import './styles/layout.css';
import './api-portal/styles/api-portal.css';
import App from './App';
import ApiPortalApp from './api-portal/ApiPortalApp';

const host = window.location.hostname;
const isApiPortal = host === 'api.alexball.dev' || host.startsWith('api.')
  || (import.meta.env.DEV && new URLSearchParams(window.location.search).has('apiPortal'));

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isApiPortal ? <ApiPortalApp /> : <App />}
  </StrictMode>
);
