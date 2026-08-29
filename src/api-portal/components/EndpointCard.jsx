import Icon from '../../ui/Icon';
import MethodBadge from './MethodBadge';

export default function EndpointCard({ endpoint }) {
  return (
    <div className="card endpoint-card">
      <div className="endpoint-head">
        <MethodBadge method={endpoint.method} />
        <span className="endpoint-path mono">{endpoint.path}</span>
      </div>
      <h3 className="endpoint-name">{endpoint.name}</h3>
      <p className="endpoint-desc">{endpoint.description}</p>
      <a className="link-arrow" href={endpoint.path} target="_blank" rel="noreferrer">
        View Response <Icon name="external" />
      </a>
    </div>
  );
}
