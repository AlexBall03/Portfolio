import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Icon from '../ui/Icon';

function PagerPanel({ dir, current, target, strings }) {
  const isPrev = dir === 'prev';
  const desc = strings.pager?.descriptions?.[target.id];

  return (
    <Link
      to={target.path}
      className={`pager-panel pager-panel--${dir}`}
    >
      <div className="pager-panel-body">
        <span className="pager-tag mono">{isPrev ? 'PREV' : 'NEXT'}</span>
        <span className="pager-idx mono">
          {String(current + 1).padStart(2, '0')} → {String(target.index + 1).padStart(2, '0')}
        </span>
        <span className="pager-title">{target.label}</span>
        {desc && <span className="pager-desc">{desc}</span>}
      </div>
      <Icon name="arrowRight" className="pager-arrow" />
    </Link>
  );
}

export default function Pager({ index, screens }) {
  const { strings } = useApp();
  const prev = screens[index - 1] ? { ...screens[index - 1], index: index - 1 } : null;
  const next = screens[index + 1] ? { ...screens[index + 1], index: index + 1 } : null;
  const single = !prev || !next;

  return (
    <div className="band pager-band">
      <div className={`wrap pager-grid ${single ? 'pager-single' : ''}`}>
        {prev && <PagerPanel dir="prev" current={index} target={prev} strings={strings} />}
        {next && <PagerPanel dir="next" current={index} target={next} strings={strings} />}
      </div>
    </div>
  );
}
