import { ENDPOINTS } from '../portalData';
import EndpointCard from './EndpointCard';

export default function EndpointList() {
  return (
    <div className="endpoint-list">
      {ENDPOINTS.map((endpoint) => (
        <EndpointCard key={endpoint.path} endpoint={endpoint} />
      ))}
    </div>
  );
}
