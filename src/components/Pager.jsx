import { useApp } from '../context/AppContext';
import Icon from '../ui/Icon';

export default function Pager({ index, screens }) {
  const { goToScreen } = useApp();
  const prev = screens[index - 1];
  const next = screens[index + 1];
  return (
    <div className="band pager-band">
      <div className="wrap pager-row">
        {prev ? (
          <button className="btn btn-ghost btn-sm" onClick={() => goToScreen(prev.id)}>
            <Icon name="arrowRight" style={{ transform: 'rotate(180deg)' }} /> {prev.label}
          </button>
        ) : <span />}
        <span className="pager-count mono">
          {String(index + 1).padStart(2, '0')} / {String(screens.length).padStart(2, '0')}
        </span>
        {next ? (
          <button className="btn btn-primary btn-sm" onClick={() => goToScreen(next.id)}>
            {next.label} <Icon name="arrowRight" />
          </button>
        ) : <span />}
      </div>
    </div>
  );
}
